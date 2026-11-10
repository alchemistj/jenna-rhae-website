import { afterEach, describe, expect, it } from "vitest";
import handler, { handleSiteEvents } from "../api/site-events";
import {
  CLIENT_USER_AGENT_HEADER,
  MAX_CLIENT_USER_AGENT_CHARS,
  MEASUREMENT_FORWARD_KEYS,
  MEASUREMENT_SITE_KEY,
  REPORTS_MEASUREMENT_COLLECT_URL,
  forwardMeasurementCollect,
  measurementCollectHealth,
} from "../server/lib/forwardMeasurementCollect";

const productionEvent = {
  contractVersion: "ff-measure.v1",
  siteKey: "someone-else",
  environment: "production",
  event: "page_view",
  eventId: "jr-11111111-1111-4111-8111-111111111111",
  occurredAt: "2026-11-09T12:00:00.000Z",
  visitorId: "ffvid-11111111-1111-4111-8111-111111111111",
  sessionId: "ffsid-11111111-1111-4111-8111-111111111111",
  landingPath: "/trauma-coaching/",
  currentPath: "/contact/",
  referrer: "https://www.google.com/search",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "trauma",
  gclid: "click-123",
  channel: "paid",
  device: "desktop",
  ctaLocation: "header",
  email: "jane@example.com",
  phone: "(816) 555-0100",
  name: "Jane Reader",
  engaged: true,
  automation: false,
  message: "Please ignore this test.",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("forwardMeasurementCollect", () => {
  it("drops unknown keys, forces the site key, and posts to FF Reports with the visitor user agent", async () => {
    const longAgent = `Mozilla/5.0 ${"A".repeat(1100)}`;
    let forwardedUrl = "";
    const captured: { body: Record<string, unknown> | null; headers: Record<string, string> } = {
      body: null,
      headers: {},
    };
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      forwardedUrl = String(url);
      captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      captured.headers = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ ok: true, accepted: 1 }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const result = await forwardMeasurementCollect({
      body: productionEvent,
      origin: "https://jennarhae.com",
      vercelEnv: "production",
      userAgent: longAgent,
      fetchImpl,
    });

    expect(result.status).toBe(202);
    expect(forwardedUrl).toBe(REPORTS_MEASUREMENT_COLLECT_URL);
    expect(captured.headers.Origin).toBe("https://jennarhae.com");
    expect(captured.headers[CLIENT_USER_AGENT_HEADER]).toBe(longAgent.trim().slice(0, MAX_CLIENT_USER_AGENT_CHARS));
    expect(captured.headers[CLIENT_USER_AGENT_HEADER]).toHaveLength(MAX_CLIENT_USER_AGENT_CHARS);
    const forwardedBody = captured.body ?? {};
    expect(forwardedBody.siteKey).toBe(MEASUREMENT_SITE_KEY);
    expect(forwardedBody.siteKey).toBe("jenna-rhae-website");
    expect(forwardedBody.environment).toBe("production");
    expect(forwardedBody.event).toBe("page_view");
    expect(forwardedBody.visitorId).toBe(productionEvent.visitorId);
    expect(forwardedBody.sessionId).toBe(productionEvent.sessionId);
    expect(forwardedBody.currentPath).toBe("/contact/");
    expect(forwardedBody.engaged).toBe(true);
    expect(forwardedBody).not.toHaveProperty("automation");
    expect(forwardedBody).not.toHaveProperty("email");
    expect(forwardedBody).not.toHaveProperty("name");
    expect(forwardedBody).not.toHaveProperty("message");
    for (const key of Object.keys(forwardedBody)) {
      expect(MEASUREMENT_FORWARD_KEYS).toContain(key);
    }
    expect(JSON.stringify(forwardedBody)).not.toMatch(/jane@example.com|555-0100|Jane Reader/);
  });

  it("omits a blank user agent", async () => {
    const captured: { headers: Record<string, string> } = { headers: {} };
    const result = await forwardMeasurementCollect({
      body: productionEvent,
      origin: "https://jennarhae.com",
      vercelEnv: "production",
      userAgent: "   ",
      fetchImpl: (async (_url, init) => {
        captured.headers = (init?.headers ?? {}) as Record<string, string>;
        return new Response("{}", { status: 202 });
      }) as typeof fetch,
    });
    expect(result.status).toBe(202);
    expect(CLIENT_USER_AGENT_HEADER in captured.headers).toBe(false);
  });

  it("does not forward a production event from a preview or www host", async () => {
    let called: boolean;
    const fetchImpl = (async () => {
      called = true;
      return new Response("{}", { status: 202 });
    }) as typeof fetch;
    for (const origin of [
      "https://jenna-rhae-website-git-preview.vercel.app",
      "https://www.jennarhae.com",
    ]) {
      called = false;
      const result = await forwardMeasurementCollect({
        body: productionEvent,
        origin,
        vercelEnv: "production",
        fetchImpl,
      });
      expect(called, origin).toBe(false);
      expect(result.status).toBe(202);
      expect(JSON.parse(result.body)).toEqual({
        ok: true,
        stored: false,
        skipped: "non_production_host",
        originRewrite: "none",
      });
    }
  });

  it("sets preview from VERCEL_ENV and does not relabel that event as production", async () => {
    const captured: { body: Record<string, unknown> } = { body: {} };
    const result = await forwardMeasurementCollect({
      body: { ...productionEvent, environment: "production" },
      origin: "https://jenna-rhae-website-git-preview.vercel.app",
      vercelEnv: "preview",
      fetchImpl: (async (_url, init) => {
        captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ ok: true }), { status: 202 });
      }) as typeof fetch,
    });
    expect(result.status).toBe(202);
    expect(captured.body.environment).toBe("preview");
    expect(captured.body.siteKey).toBe(MEASUREMENT_SITE_KEY);
  });

  it("returns 502 when Reports is unreachable", async () => {
    const result = await forwardMeasurementCollect({
      body: productionEvent,
      origin: "https://jennarhae.com",
      vercelEnv: "production",
      fetchImpl: (async () => {
        throw new Error("offline");
      }) as typeof fetch,
    });
    expect(result.status).toBe(502);
  });

  it("keeps GET health local and names the collect upstream", async () => {
    expect(measurementCollectHealth().originRewrite).toBe("none");
    expect(measurementCollectHealth().siteKey).toBe("jenna-rhae-website");
    const health = await handleSiteEvents({ method: "GET" });
    expect(health.status).toBe(200);
    expect(JSON.parse(health.body).upstream).toBe(REPORTS_MEASUREMENT_COLLECT_URL);
    const denied = await handleSiteEvents({ method: "PUT" });
    expect(denied.status).toBe(405);
  });

  it("reads a Node request body and forwards x-ff-client-user-agent", async () => {
    let sawAgent = "";
    globalThis.fetch = (async (_url, init) => {
      sawAgent = (init?.headers as Record<string, string>)[CLIENT_USER_AGENT_HEADER] ?? "";
      return new Response(JSON.stringify({ ok: true }), { status: 202 });
    }) as typeof fetch;

    const req = {
      method: "POST",
      headers: {
        origin: "https://jennarhae.com",
        "user-agent": "JennaTest/1.0",
      },
      async *[Symbol.asyncIterator]() {
        yield JSON.stringify({ ...productionEvent, event: "contact_click" });
      },
    };
    const res = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      end(body?: string) {
        this.body = body ?? "";
      },
      body: "",
    };
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      await handler(req, res);
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous;
    }
    expect(res.statusCode).toBe(202);
    expect(sawAgent).toBe("JennaTest/1.0");
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });
});
