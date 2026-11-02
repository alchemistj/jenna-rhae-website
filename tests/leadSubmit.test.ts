import { describe, expect, it, vi } from "vitest";
import {
  buildLeadBody,
  createLeadSubmitter,
  isProductionHost,
  REQUEST_TIMEOUT_MS,
  type LeadEnv,
  type LeadFields,
} from "../src/lib/leadSubmit";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function makeEnv(overrides: Partial<LeadEnv> & { responses?: (Response | Error)[] } = {}) {
  const queue = [...(overrides.responses ?? [])];
  const uuids = [UUID_A, UUID_B, "44444444-4444-4444-8444-444444444444"];
  const fetchMock = vi.fn(async () => {
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return next ?? jsonResponse(200, { ok: true, id: LEAD_ID, conversionEligible: true });
  });
  const env: LeadEnv = {
    hostname: "jennarhae.com",
    href: "https://jennarhae.com/contact/?utm_source=google&utm_medium=cpc",
    referrer: "https://www.google.com/",
    search: "?utm_source=google&utm_medium=cpc",
    fetch: fetchMock as unknown as typeof fetch,
    now: () => Date.parse("2026-11-02T12:00:10.000Z"),
    uuid: () => uuids.shift() ?? UUID_B,
    ...overrides,
  };
  return { env, fetchMock };
}

const startedAt = Date.parse("2026-11-02T12:00:00.000Z");

function sentBody(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  const init = fetchMock.mock.calls[call]![1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe("production host gate", () => {
  it("allows only jennarhae.com", () => {
    expect(isProductionHost("jennarhae.com")).toBe(true);
    for (const host of ["www.jennarhae.com", "localhost", "127.0.0.1", "jenna-rhae-website.vercel.app", "evil.com"]) {
      expect(isProductionHost(host), host).toBe(false);
    }
  });

  it("never posts from localhost or a preview host", async () => {
    for (const hostname of ["localhost", "jenna-rhae-website-git-build-base.vercel.app"]) {
      const { env, fetchMock } = makeEnv({ hostname });
      const result = await createLeadSubmitter(env).submit(fields, startedAt);
      expect(result).toEqual({ kind: "not_production" });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});

describe("request body", () => {
  it("matches the Central Forms contract", async () => {
    const { env, fetchMock } = makeEnv();
    await createLeadSubmitter(env).submit({ ...fields, smsConsent: true }, startedAt);
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://forms.fluidframemarketing.com/api/lead");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    // Only the headers the intake's CORS allows.
    expect(init.headers).toEqual({ "Content-Type": "application/json", Accept: "application/json" });
    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      siteKey: "jenna-rhae-website",
      formKey: "main-contact",
      clientSubmissionId: UUID_A,
      name: "Test Person",
      email: "test@example.com",
      phone: "",
      message: "Test - hello, please ignore",
      honeypot: "",
      formStartedAt: "2026-11-02T12:00:00.000Z",
      submittedAt: "2026-11-02T12:00:10.000Z",
      pageUrl: "https://jennarhae.com/contact/?utm_source=google&utm_medium=cpc",
      referrer: "https://www.google.com/",
      utm: { source: "google", medium: "cpc", campaign: "", term: "", content: "" },
    });
  });

  it("puts the how-did-you-hear answer and SMS consent in customFields with human labels", () => {
    const body = buildLeadBody(fields, UUID_A, startedAt, {
      href: "https://jennarhae.com/contact/",
      referrer: "",
      search: "",
      now: () => startedAt + 5000,
    });
    expect(body.customFields).toEqual({
      howHeard: { label: "How did you find Jenna?", value: "Referral", type: "text" },
      smsConsent: { label: "SMS consent", value: "No", type: "text" },
    });
    expect(body.referrer).toBeNull();
    const yes = buildLeadBody({ ...fields, smsConsent: true }, UUID_A, startedAt, {
      href: "",
      referrer: "",
      search: "",
      now: () => startedAt,
    });
    expect(yes.customFields.smsConsent!.value).toBe("Yes");
  });

  it("omits the how-heard field when nothing was chosen and keeps no technical keys", () => {
    const body = buildLeadBody({ ...fields, howHeard: "" }, UUID_A, startedAt, {
      href: "",
      referrer: "",
      search: "",
      now: () => startedAt,
    });
    expect(Object.keys(body.customFields)).toEqual(["smsConsent"]);
  });

  it("sends the honeypot value so Central Forms can flag it", async () => {
    const { env, fetchMock } = makeEnv();
    await createLeadSubmitter(env).submit({ ...fields, honeypot: "http://spam.example" }, startedAt);
    expect(sentBody(fetchMock).honeypot).toBe("http://spam.example");
  });
});

describe("responses", () => {
  it("success on ok:true with a real UUID: conversion once, then a new id for the next inquiry", async () => {
    const { env, fetchMock } = makeEnv({
      responses: [
        jsonResponse(200, { ok: true, id: LEAD_ID, conversionEligible: true }),
        jsonResponse(200, { ok: true, id: LEAD_ID, conversionEligible: true }),
      ],
    });
    const submitter = createLeadSubmitter(env);
    const first = await submitter.submit(fields, startedAt);
    expect(first).toEqual({ kind: "success", id: LEAD_ID, duplicate: false, conversion: true });
    expect(submitter.currentId).toBeNull();
    await submitter.submit(fields, startedAt);
    expect(sentBody(fetchMock, 0).clientSubmissionId).toBe(UUID_A);
    expect(sentBody(fetchMock, 1).clientSubmissionId).toBe(UUID_B);
  });

  it("a duplicate is a success with no conversion", async () => {
    const { env } = makeEnv({
      responses: [jsonResponse(200, { ok: true, id: LEAD_ID, duplicate: true, conversionEligible: true })],
    });
    expect(await createLeadSubmitter(env).submit(fields, startedAt)).toEqual({
      kind: "success",
      id: LEAD_ID,
      duplicate: true,
      conversion: false,
    });
  });

  it("a quarantined lead shows success but fires nothing", async () => {
    const { env } = makeEnv({
      responses: [jsonResponse(200, { ok: true, id: LEAD_ID, conversionEligible: false })],
    });
    const result = await createLeadSubmitter(env).submit(fields, startedAt);
    expect(result).toMatchObject({ kind: "success", conversion: false });
  });

  it("ok:true without a real UUID is not a success and keeps the id", async () => {
    const { env } = makeEnv({ responses: [jsonResponse(200, { ok: true, id: "not-a-uuid" })] });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "unconfirmed" });
    expect(submitter.currentId).toBe(UUID_A);
  });

  it("400 with nothing stored is invalid and the next attempt gets a new id", async () => {
    const { env, fetchMock } = makeEnv({
      responses: [jsonResponse(400, { ok: false, reason: "invalid" }), jsonResponse(200, { ok: true, id: LEAD_ID })],
    });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "invalid" });
    await submitter.submit(fields, startedAt);
    expect(sentBody(fetchMock, 1).clientSubmissionId).toBe(UUID_B);
  });

  it("400 with saved:true is unconfirmed and keeps the id", async () => {
    const { env } = makeEnv({ responses: [jsonResponse(400, { ok: false, saved: true })] });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "unconfirmed" });
    expect(submitter.currentId).toBe(UUID_A);
  });

  it("429 is rate limited and keeps the id for the retry", async () => {
    const { env, fetchMock } = makeEnv({
      responses: [jsonResponse(429, { ok: false }), jsonResponse(200, { ok: true, id: LEAD_ID, conversionEligible: true })],
    });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "rate_limited" });
    await submitter.submit(fields, startedAt);
    expect(sentBody(fetchMock, 0).clientSubmissionId).toBe(sentBody(fetchMock, 1).clientSubmissionId);
  });

  it.each([403, 500, 503])("%i is unconfirmed and a retry reuses the same clientSubmissionId", async (status) => {
    const { env, fetchMock } = makeEnv({
      responses: [jsonResponse(status, { ok: false }), jsonResponse(200, { ok: true, id: LEAD_ID })],
    });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "unconfirmed" });
    await submitter.submit(fields, startedAt);
    expect(sentBody(fetchMock, 0).clientSubmissionId).toBe(UUID_A);
    expect(sentBody(fetchMock, 1).clientSubmissionId).toBe(UUID_A);
  });

  it("a network error or unparseable JSON is unconfirmed and keeps the id", async () => {
    const { env, fetchMock } = makeEnv({
      responses: [new TypeError("network down"), new Response("<html>oops</html>", { status: 502 })],
    });
    const submitter = createLeadSubmitter(env);
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "unconfirmed" });
    expect(await submitter.submit(fields, startedAt)).toEqual({ kind: "unconfirmed" });
    expect(sentBody(fetchMock, 0).clientSubmissionId).toBe(UUID_A);
    expect(submitter.currentId).toBe(UUID_A);
  });

  it("times out after 45 seconds (above Central Forms' 35 second deadline)", async () => {
    expect(REQUEST_TIMEOUT_MS).toBe(45_000);
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      });
      const { env } = makeEnv({ fetch: fetchMock as unknown as typeof fetch });
      const pending = createLeadSubmitter(env).submit(fields, startedAt);
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
      expect(await pending).toEqual({ kind: "unconfirmed" });
    } finally {
      vi.useRealTimers();
    }
  });
});
