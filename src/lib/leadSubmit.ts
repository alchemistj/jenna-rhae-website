/**
 * Central Forms submit (SOP central-forms-contact-form.md sections 4a to 4f).
 * The browser posts straight to https://forms.fluidframemarketing.com/api/lead, only from a production host.
 * One clientSubmissionId per logical inquiry, reused on every retry, replaced after success or a 400.
 */
import { FORMS } from "./site";

export const REQUEST_TIMEOUT_MS = 45_000;
const UUID_RE = /^[0-9a-f-]{36}$/i;

export interface LeadFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  howHeard: string;
  smsConsent: boolean;
  /** Value of the hidden honeypot input. Anything here is a spam signal. */
  honeypot: string;
}

/** Human labels for the custom fields: Central Forms prints them as "Label: value" in the client email. */
export interface LeadLabels {
  howHeard: string;
  smsConsent: string;
}

export const DEFAULT_LABELS: LeadLabels = {
  howHeard: "How did you find Jenna?",
  smsConsent: "SMS consent",
};

export interface LeadEnv {
  hostname: string;
  href: string;
  referrer: string;
  search: string;
  fetch: typeof fetch;
  now: () => number;
  uuid: () => string;
}

export type LeadResult =
  | { kind: "success"; id: string; duplicate: boolean; conversion: boolean }
  | { kind: "invalid" }
  | { kind: "rate_limited" }
  | { kind: "unconfirmed" }
  | { kind: "not_production" };

export interface LeadBody {
  siteKey: string;
  formKey: string;
  clientSubmissionId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  honeypot: string;
  formStartedAt: string;
  submittedAt: string;
  pageUrl: string;
  referrer: string | null;
  utm: { source: string; medium: string; campaign: string; term: string; content: string };
  customFields: Record<string, { label: string; value: string; type: "text" }>;
}

export function isProductionHost(hostname: string): boolean {
  return FORMS.productionHosts.includes(hostname);
}

export function buildLeadBody(
  fields: LeadFields,
  attemptId: string,
  startedAt: number,
  env: Pick<LeadEnv, "href" | "referrer" | "search" | "now">,
  labels: LeadLabels = DEFAULT_LABELS,
): LeadBody {
  const t = (v: string) => v.trim();
  const q = new URLSearchParams(env.search);
  const customFields: LeadBody["customFields"] = {};
  if (t(fields.howHeard)) {
    customFields.howHeard = { label: labels.howHeard, value: t(fields.howHeard), type: "text" };
  }
  customFields.smsConsent = { label: labels.smsConsent, value: fields.smsConsent ? "Yes" : "No", type: "text" };
  return {
    siteKey: FORMS.siteKey,
    formKey: FORMS.formKey,
    clientSubmissionId: attemptId,
    name: `${t(fields.firstName)} ${t(fields.lastName)}`.trim(),
    email: t(fields.email),
    phone: t(fields.phone),
    message: t(fields.message),
    honeypot: t(fields.honeypot),
    formStartedAt: new Date(startedAt).toISOString(),
    submittedAt: new Date(env.now()).toISOString(),
    pageUrl: env.href,
    referrer: env.referrer || null,
    utm: {
      source: q.get("utm_source") ?? "",
      medium: q.get("utm_medium") ?? "",
      campaign: q.get("utm_campaign") ?? "",
      term: q.get("utm_term") ?? "",
      content: q.get("utm_content") ?? "",
    },
    customFields,
  };
}

export function createLeadSubmitter(env: LeadEnv, labels: LeadLabels = DEFAULT_LABELS) {
  let attemptId: string | null = null;

  return {
    /** The id currently reserved for this inquiry (null before the first attempt or after success). */
    get currentId() {
      return attemptId;
    },
    async submit(fields: LeadFields, startedAt: number): Promise<LeadResult> {
      if (!isProductionHost(env.hostname)) return { kind: "not_production" };
      attemptId ??= env.uuid();
      const body = buildLeadBody(fields, attemptId, startedAt, env, labels);
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await env.fetch(FORMS.leadUrl, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          id?: string;
          duplicate?: boolean;
          conversionEligible?: boolean;
          saved?: boolean;
        } | null;
        if (res.ok && json?.ok === true && UUID_RE.test(json.id ?? "")) {
          attemptId = null;
          const duplicate = json.duplicate === true;
          return {
            kind: "success",
            id: json.id as string,
            duplicate,
            conversion: !duplicate && json.conversionEligible === true,
          };
        }
        if (res.status === 400 && json?.ok === false && !json.saved) {
          attemptId = null;
          return { kind: "invalid" };
        }
        if (res.status === 429) return { kind: "rate_limited" };
        return { kind: "unconfirmed" };
      } catch {
        return { kind: "unconfirmed" };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
