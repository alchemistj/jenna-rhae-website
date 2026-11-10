const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export const FF_VID_COOKIE = "ff_vid";
export const FF_SID_COOKIE = "ff_sid";
export const FF_BOT_COOKIE = "ff_bot";

export type JourneyIdentity = {
  visitorId: string;
  sessionId: string;
};

function validIdentityId(value: string | undefined): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed || !OPAQUE_ID_PATTERN.test(trimmed)) return null;
  return trimmed.slice(0, 128);
}

function cookieValues(cookieHeader: string | null | undefined, name: string): string[] {
  if (!cookieHeader) return [];
  const values: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const raw = part.slice(separator + 1).trim();
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    values.push(decoded);
  }
  return values;
}

/** One cookie name. Duplicate or malformed values are untrusted. */
export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  const values = cookieValues(cookieHeader, name);
  if (values.length !== 1) return null;
  return validIdentityId(values[0]);
}

/** Raw single cookie value, without the identity-id pattern. */
export function readRawCookie(cookieHeader: string | null | undefined, name: string): string | null {
  const values = cookieValues(cookieHeader, name);
  if (values.length !== 1) return null;
  return values[0] ?? null;
}

export function hasBotMarker(cookieHeader: string | null | undefined): boolean {
  return cookieValues(cookieHeader, FF_BOT_COOKIE).includes("1");
}

/**
 * Both cookies are required together. A missing or invalid one means the
 * event carries neither id, rather than a mix.
 */
export function readJourneyIdentity(
  cookieHeader: string | null | undefined = typeof document !== "undefined" ? document.cookie : null,
): JourneyIdentity | null {
  const visitorId = readCookieValue(cookieHeader, FF_VID_COOKIE);
  const sessionId = readCookieValue(cookieHeader, FF_SID_COOKIE);
  if (!visitorId || !sessionId) return null;
  return { visitorId, sessionId };
}

/** Cookie pair when both are valid. Otherwise neither id. */
export function resolveJourneyIds(cookieHeader?: string | null): {
  visitorId: string | null;
  sessionId: string | null;
} {
  const header =
    cookieHeader !== undefined
      ? cookieHeader
      : typeof document !== "undefined"
        ? document.cookie
        : null;
  const cookies = readJourneyIdentity(header);
  if (cookies) return cookies;
  return { visitorId: null, sessionId: null };
}
