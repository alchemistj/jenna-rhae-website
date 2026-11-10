import { pathOnly, referrerWithoutQuery } from "../measurement/contract";
import {
  emptySnapshot,
  extractAttributionFromSearch,
  hasAttributionParams,
  sanitizeTouch,
  type AttributionSnapshot,
  type AttributionTouch,
} from "./snapshot";

const STORAGE_KEY = "jr_attribution_v1";
const ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStored(): AttributionSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AttributionSnapshot>;
    const touch = sanitizeTouch(parsed);
    const capturedAt = Date.parse(touch.captured_at);
    if (!Number.isFinite(capturedAt) || Date.now() - capturedAt > ATTRIBUTION_MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      ...touch,
      first_touch: parsed.first_touch ? sanitizeTouch(parsed.first_touch) : null,
      latest_touch: parsed.latest_touch ? sanitizeTouch(parsed.latest_touch) : null,
    };
  } catch {
    return null;
  }
}

function writeStored(snapshot: AttributionSnapshot): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

function touchFrom(snapshot: AttributionTouch): AttributionTouch {
  return sanitizeTouch(snapshot);
}

/** Remember landing, referrer, and campaign params. Session ids are not stored. */
export function captureAttributionOnEntry(pathname: string, search: string): AttributionSnapshot {
  const existing = readStored();
  const fromQuery = extractAttributionFromSearch(search);
  const hasQuery = hasAttributionParams(search);
  const capturedAt = new Date().toISOString();
  const referrer =
    referrerWithoutQuery(typeof document !== "undefined" ? document.referrer || null : null) ||
    existing?.referrer ||
    null;
  const landing = pathOnly(pathname) || existing?.landing_page || "/";
  const newTouch = hasQuery
    ? sanitizeTouch({
        ...fromQuery,
        landing_page: landing,
        referrer,
        captured_at: capturedAt,
      })
    : null;
  const merged: AttributionSnapshot = {
    ...sanitizeTouch({
      landing_page: existing?.landing_page || landing,
      referrer: existing?.referrer || referrer,
      utm_source: fromQuery.utm_source ?? existing?.utm_source ?? null,
      utm_medium: fromQuery.utm_medium ?? existing?.utm_medium ?? null,
      utm_campaign: fromQuery.utm_campaign ?? existing?.utm_campaign ?? null,
      utm_term: fromQuery.utm_term ?? existing?.utm_term ?? null,
      utm_content: fromQuery.utm_content ?? existing?.utm_content ?? null,
      utm_id: fromQuery.utm_id ?? existing?.utm_id ?? null,
      gclid: fromQuery.gclid ?? existing?.gclid ?? null,
      gbraid: fromQuery.gbraid ?? existing?.gbraid ?? null,
      wbraid: fromQuery.wbraid ?? existing?.wbraid ?? null,
      msclkid: fromQuery.msclkid ?? existing?.msclkid ?? null,
      captured_at: hasQuery || !existing ? capturedAt : existing.captured_at,
    }),
    first_touch: existing?.first_touch || (newTouch ? touchFrom(newTouch) : null),
    latest_touch: newTouch ? touchFrom(newTouch) : (existing?.latest_touch ?? null),
  };
  writeStored(merged);
  return merged;
}

export function getStoredAttribution(): AttributionSnapshot {
  return readStored() ?? emptySnapshot();
}

/** Current page params fill gaps. Stored first-touch stays. No session id is read or written. */
export function attributionSnapshotForLead(input: {
  href: string;
  referrer: string;
  search: string;
}): AttributionSnapshot {
  const stored = getStoredAttribution();
  const fromQuery = extractAttributionFromSearch(input.search);
  const path = pathOnly(input.href) || stored.landing_page || "/";
  const referrer = stored.referrer || referrerWithoutQuery(input.referrer);
  const current = sanitizeTouch({
    landing_page: stored.landing_page || path,
    referrer,
    utm_source: fromQuery.utm_source ?? stored.utm_source,
    utm_medium: fromQuery.utm_medium ?? stored.utm_medium,
    utm_campaign: fromQuery.utm_campaign ?? stored.utm_campaign,
    utm_term: fromQuery.utm_term ?? stored.utm_term,
    utm_content: fromQuery.utm_content ?? stored.utm_content,
    utm_id: fromQuery.utm_id ?? stored.utm_id,
    gclid: fromQuery.gclid ?? stored.gclid,
    gbraid: fromQuery.gbraid ?? stored.gbraid,
    wbraid: fromQuery.wbraid ?? stored.wbraid,
    msclkid: fromQuery.msclkid ?? stored.msclkid,
    captured_at: stored.captured_at,
  });
  return {
    ...current,
    first_touch: stored.first_touch,
    latest_touch: stored.latest_touch ?? current,
  };
}

export function clearStoredAttributionForTests(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
