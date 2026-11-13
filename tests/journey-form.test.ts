import { afterEach, describe, expect, it, vi } from "vitest";
import { createLeadSubmitter, type LeadEnv, type LeadFields } from "../src/lib/leadSubmit";
import { collectLeadFormSuccess } from "../src/lib/measurement/collect";
import { resetJourneyTrackingForTests } from "../src/lib/measurement/bootstrap";
import { SESSION_CHANNEL_KEY } from "../src/lib/measurement/contract";

const VISITOR = "ffvid-11111111-1111-4111-8111-111111111111";
const SESSION = "ffsid-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COOKIE = `ff_vid=${VISITOR}; ff_sid=${SESSION}`;
const LEAD_ID = "33333333-3333-4333-8333-333333333333";

const fields: LeadFields = {
  firstName: " Test ",
  lastName: "Person ",
  email: " test@example.com ",
  phone: "",
  message: " Test - hello, please ignore ",
  howHeard: "Referral",
  smsConsent: false,
  honeypot: "",
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

afterEach(() => {
  resetJourneyTrackingForTests();
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { window?: unknown }).window;
  vi.unstubAllGlobals();
});

describe("form attribution envelope", () => {
  it("carries the same ff_vid and ff_sid as the lead_form_success event and no form text", async () => {
    const session = memoryStorage();
    const local = memoryStorage();
    const journeyBodies: string[] = [];
    vi.stubGlobal("document", { cookie: COOKIE, referrer: "https://www.google.com/search?q=test@example.com" });
    vi.stubGlobal("window", {
      sessionStorage: session,
      localStorage: local,
      location: { pathname: "/contact/", hostname: "jennarhae.com", search: "?utm_source=google&utm_medium=cpc" },
      innerWidth: 1200,
      navigator: { webdriver: false, userAgent: "Mozilla/5.0", languages: ["en-US"] },
    });

    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true, id: LEAD_ID, duplicate: false, conversionEligible: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const env: LeadEnv = {
      hostname: "jennarhae.com",
      href: "https://jennarhae.com/contact/?utm_source=google&utm_medium=cpc",
      referrer: "https://www.google.com/search?q=test@example.com",
      search: "?utm_source=google&utm_medium=cpc",
      fetch: fetchMock as unknown as typeof fetch,
      now: () => Date.parse("2026-11-09T12:00:10.000Z"),
      uuid: () => "11111111-1111-4111-8111-111111111111",
      cookie: COOKIE,
    };
    const result = await createLeadSubmitter(env).submit(fields, Date.parse("2026-11-09T12:00:00.000Z"));
    expect(result).toEqual({ kind: "success", id: LEAD_ID, duplicate: false, conversion: true });
    const leadBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    const attribution = leadBody.attribution as Record<string, unknown>;
    expect(attribution.site_key).toBe("jenna-rhae-website");
    expect(attribution.visitor_id).toBe(VISITOR);
    expect(attribution.session_id).toBe(SESSION);
    expect(attribution.landing_page).toBe("/contact/");
    expect(attribution.referrer).toBe("https://www.google.com/search");
    expect(attribution.utm_source).toBe("google");
    expect(attribution.assignment_snapshot).toBeNull();
    expect(JSON.stringify(attribution)).not.toMatch(/test@example.com|Test Person|please ignore/);
    expect(leadBody.email).toBe("test@example.com");
    expect(leadBody.siteKey).toBe("jenna-rhae-website");
    expect(leadBody.formKey).toBe("main-contact");

    const sent = await collectLeadFormSuccess(
      { submissionId: LEAD_ID, formSource: "main-contact", currentPath: "/contact/" },
      {
        cookieHeader: COOKIE,
        currentHost: "jennarhae.com",
        fetchImpl: (async (_url, init) => {
          journeyBodies.push(String(init?.body));
          return new Response("{}", { status: 202 });
        }) as typeof fetch,
      },
    );
    expect(sent).toMatchObject({ ok: true, sent: true });
    const event = JSON.parse(journeyBodies[0] ?? "{}") as Record<string, unknown>;
    expect(event.event).toBe("lead_form_success");
    expect(event.visitorId).toBe(attribution.visitor_id);
    expect(event.sessionId).toBe(attribution.session_id);
    expect(event.currentPath).toBe("/contact/");
    expect(event.submissionId).toBe(LEAD_ID);
    expect(event.formSource).toBe("main-contact");
    expect(JSON.stringify(event)).not.toMatch(/test@example.com|Test Person|please ignore/);

    const stored = [...Array(session.length).keys()].map((index) => `${session.key(index)}=${session.getItem(session.key(index)!)}`);
    expect(stored.join("\n")).not.toContain(SESSION);
    expect(stored.join("\n")).not.toContain(VISITOR);
    expect(session.getItem(SESSION_CHANNEL_KEY)).toBe("direct");
  });
});
