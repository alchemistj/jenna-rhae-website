const QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
] as const;

type QueryKey = (typeof QUERY_KEYS)[number];

const FIELD_LIMITS: Record<QueryKey, number> = {
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 120,
  utm_term: 120,
  utm_content: 120,
  utm_id: 120,
  gclid: 200,
  gbraid: 200,
  wbraid: 200,
  msclkid: 200,
};

export type AttributionTouch = {
  landing_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  utm_id: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  msclkid: string | null;
  captured_at: string;
};

export type AttributionSnapshot = AttributionTouch & {
  first_touch: AttributionTouch | null;
  latest_touch: AttributionTouch | null;
};

function readQueryValue(params: URLSearchParams, key: QueryKey): string | null {
  const raw = params.get(key);
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > FIELD_LIMITS[key]) return null;
  return trimmed;
}

export function extractAttributionFromSearch(search: string): Partial<AttributionTouch> {
  const params = new URLSearchParams(search.startsWith("?") ? search : search ? `?${search}` : "");
  const partial: Partial<AttributionTouch> = {};
  for (const key of QUERY_KEYS) {
    const value = readQueryValue(params, key);
    if (value) partial[key] = value;
  }
  return partial;
}

export function hasAttributionParams(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search : search ? `?${search}` : "");
  return QUERY_KEYS.some((key) => Boolean(readQueryValue(params, key)));
}

function trimOrNull(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed.slice(0, max) : null;
}

export function sanitizeTouch(input: Partial<AttributionTouch> | null | undefined): AttributionTouch {
  const safe = input ?? {};
  return {
    landing_page: trimOrNull(safe.landing_page, 500),
    referrer: trimOrNull(safe.referrer, 500),
    utm_source: trimOrNull(safe.utm_source, FIELD_LIMITS.utm_source),
    utm_medium: trimOrNull(safe.utm_medium, FIELD_LIMITS.utm_medium),
    utm_campaign: trimOrNull(safe.utm_campaign, FIELD_LIMITS.utm_campaign),
    utm_term: trimOrNull(safe.utm_term, FIELD_LIMITS.utm_term),
    utm_content: trimOrNull(safe.utm_content, FIELD_LIMITS.utm_content),
    utm_id: trimOrNull(safe.utm_id, FIELD_LIMITS.utm_id),
    gclid: trimOrNull(safe.gclid, FIELD_LIMITS.gclid),
    gbraid: trimOrNull(safe.gbraid, FIELD_LIMITS.gbraid),
    wbraid: trimOrNull(safe.wbraid, FIELD_LIMITS.wbraid),
    msclkid: trimOrNull(safe.msclkid, FIELD_LIMITS.msclkid),
    captured_at: safe.captured_at || new Date().toISOString(),
  };
}

export function emptySnapshot(): AttributionSnapshot {
  return { ...sanitizeTouch({}), first_touch: null, latest_touch: null };
}
