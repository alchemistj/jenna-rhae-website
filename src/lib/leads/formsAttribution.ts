import type { AttributionSnapshot, AttributionTouch } from "../attribution/snapshot";
import { pathOnly, referrerWithoutQuery } from "../measurement/contract";
import { resolveJourneyIds } from "../measurement/identity";

/**
 * Top-level Central Forms attribution.
 * Matches the lead attribution touch FF Reports reads from `data.attribution`.
 * Names, emails, and message text stay in the lead fields, not in this envelope.
 */
export type FormsAttributionTouch = {
  landing_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  msclkid: string | null;
  utm_id: string | null;
  utm_params: Record<string, string>;
  captured_at: string | null;
};

export type FormsLeadAttribution = FormsAttributionTouch & {
  site_key: string;
  event_id: string;
  visitor_id: string | null;
  session_id: string | null;
  first_touch: FormsAttributionTouch | null;
  latest_touch: FormsAttributionTouch | null;
  assignment_snapshot: null;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id"] as const;

function textOrNull(value: string | null | undefined, max = 200): string | null {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed.slice(0, max) : null;
}

function capturedAt(value: string | null | undefined): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed || !Number.isFinite(Date.parse(trimmed))) return null;
  return new Date(trimmed).toISOString();
}

function attributionEventId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `jr-${crypto.randomUUID()}`;
  } catch {
    // Older runtimes fall through to an opaque id.
  }
  return `jr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function touchFrom(
  touch: Partial<AttributionTouch> | null | undefined,
  fallbackLanding: string | null,
): FormsAttributionTouch {
  const utmParams: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = textOrNull(touch?.[key], 120);
    if (value) utmParams[key] = value;
  }
  return {
    landing_page: pathOnly(touch?.landing_page) || fallbackLanding,
    referrer: referrerWithoutQuery(touch?.referrer),
    utm_source: textOrNull(touch?.utm_source, 120),
    utm_medium: textOrNull(touch?.utm_medium, 120),
    utm_campaign: textOrNull(touch?.utm_campaign, 120),
    utm_term: textOrNull(touch?.utm_term, 120),
    utm_content: textOrNull(touch?.utm_content, 120),
    gclid: textOrNull(touch?.gclid),
    gbraid: textOrNull(touch?.gbraid),
    wbraid: textOrNull(touch?.wbraid),
    msclkid: textOrNull(touch?.msclkid),
    utm_id: textOrNull(touch?.utm_id, 120),
    utm_params: utmParams,
    captured_at: capturedAt(touch?.captured_at),
  };
}

export function buildFormsLeadAttribution(
  siteKey: string,
  snapshot: AttributionSnapshot,
  pagePath: string,
  cookieHeader?: string | null,
): FormsLeadAttribution {
  const landing = pathOnly(snapshot.landing_page) || pathOnly(pagePath) || "/";
  const current = touchFrom(snapshot, landing);
  const identity = resolveJourneyIds(cookieHeader);
  return {
    ...current,
    site_key: siteKey,
    event_id: attributionEventId(),
    visitor_id: identity.visitorId,
    session_id: identity.sessionId,
    first_touch: snapshot.first_touch ? touchFrom(snapshot.first_touch, landing) : null,
    latest_touch: snapshot.latest_touch ? touchFrom(snapshot.latest_touch, landing) : current,
    assignment_snapshot: null,
  };
}
