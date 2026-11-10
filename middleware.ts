/**
 * First-party visitor and session cookies for journey tracking.
 * Same contract as the FF split-testing identity cookies: `ff_vid` (180 days)
 * and `ff_sid` (30 minutes, renewed on every HTML page). Bots get `ff_bot=1`
 * for 2 minutes instead. HTML pages only. No cache-control on page responses.
 *
 * Entry tags: a vanity path 308s to a real page and sets `ff_entry` for 30 minutes.
 * The list is empty until a path is added. One line in ENTRY_REDIRECTS is enough.
 */

export const FF_VID_COOKIE = "ff_vid";
export const FF_SID_COOKIE = "ff_sid";
export const FF_BOT_COOKIE = "ff_bot";
export const FF_ENTRY_COOKIE = "ff_entry";

/** 180 days, matching the website runtime visitor window. */
export const FF_VID_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
/** 30 minutes, rewritten on every eligible HTML request so the window slides. */
export const FF_SID_MAX_AGE_SECONDS = 30 * 60;
/** Short marker so a recognized bot is not given a visitor id. */
export const FF_BOT_MAX_AGE_SECONDS = 2 * 60;
export const FF_ENTRY_MAX_AGE_SECONDS = 30 * 60;

const CONTEXT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

/**
 * Skips API, build assets, and the text files this site serves.
 * The function below applies the same skips when the middleware is invoked directly.
 */
export const config = {
  matcher: [
    "/((?!api/|_astro/|images/|fonts/|favicon|robots\\.txt|sitemap|llms).*)",
  ],
};

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /discordbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /headlesschrome/i,
  /lighthouse/i,
  /chrome-lighthouse/i,
  /gtmetrix/i,
  /pingdom/i,
  /uptimerobot/i,
  /statuscake/i,
  /screaming frog/i,
  /siteauditbot/i,
  /ahrefssiteaudit/i,
  /google-inspectiontool/i,
  /bingpreview/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /scrapy/i,
  // Whole word only. A trailing `/bot\b/` also matches CUBOT handsets.
  /\bbot\b/i,
  /crawler/i,
  /spider/i,
  /preview/i,
];

const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".map",
  ".avif",
  ".xml",
  ".txt",
  ".json",
  ".pdf",
  ".mjs",
  ".html",
  ".webmanifest",
];

export type EntryRule = { destination: string; entry: string };

/**
 * Vanity paths that 308 to a canonical page and set `ff_entry`.
 * Add one line to track a new entry. Keys are the no-slash form; the
 * trailing-slash variant is handled too. Case-sensitive.
 */
export const ENTRY_REDIRECTS: Readonly<Record<string, EntryRule>> = {};

function continueWithoutChange(setCookies: readonly string[] = []): Response {
  const headers = new Headers();
  headers.set("x-middleware-next", "1");
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(null, { headers });
}

function collapsePath(pathname: string): string {
  if (!pathname) return "/";
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withSlash.replace(/\/{2,}/g, "/");
}

function decodeBoundedPath(path: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  for (let depth = 1; depth < 3 && /%[0-9a-f]{2}/i.test(decoded); depth += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }
  if (/%[0-9a-f]{2}/i.test(decoded)) return null;
  return collapsePath(decoded);
}

function isIgnoredCollapsedPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower === "/api" || lower.startsWith("/api/")) return true;
  if (lower === "/_astro" || lower.startsWith("/_astro/")) return true;
  if (lower === "/images" || lower.startsWith("/images/")) return true;
  if (lower === "/fonts" || lower.startsWith("/fonts/")) return true;
  if (lower === "/favicon.ico" || lower.startsWith("/favicon")) return true;
  if (lower === "/robots.txt") return true;
  if (/^\/sitemap.*\.xml$/.test(lower)) return true;
  if (/^\/llms.*\.txt$/.test(lower)) return true;
  return STATIC_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Canonical public HTML only: a trailing-slash document, not an asset. */
export function isCanonicalHtmlPath(pathname: string): boolean {
  const path = collapsePath(pathname);
  if (isIgnoredCollapsedPath(path)) return false;
  const decoded = decodeBoundedPath(path);
  if (decoded === null || isIgnoredCollapsedPath(decoded)) return false;
  return path === "/" || path.endsWith("/");
}

function isBotUserAgent(userAgent: string | null): boolean {
  const ua = userAgent?.trim() ?? "";
  if (!ua) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(ua));
}

function parseCookies(header: string | null): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!header) return result;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    if (!key) continue;
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // Keep the raw value so validation can reject it.
    }
    result.set(key, [...(result.get(key) ?? []), value]);
  }
  return result;
}

function validContextId(value: string | undefined): string | null {
  return value && CONTEXT_ID_PATTERN.test(value) ? value : null;
}

function readPrimaryCookie(cookies: Map<string, string[]>, name: string): string | null {
  if (!cookies.has(name)) return null;
  const values = cookies.get(name) ?? [];
  if (values.length !== 1) return null;
  return validContextId(values[0]);
}

function buildSetCookie(name: string, value: string, maxAge: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    "Secure",
  ].join("; ");
}

function newIdentityId(): string | null {
  try {
    const id = globalThis.crypto?.randomUUID?.();
    return validContextId(id ?? undefined);
  } catch {
    return null;
  }
}

function isPrefetch(request: Request): boolean {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return /prefetch|prerender/i.test(purpose);
}

export function entryRedirectFor(
  pathname: string,
  entries: Readonly<Record<string, EntryRule>> = ENTRY_REDIRECTS,
): EntryRule | null {
  const key = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!Object.prototype.hasOwnProperty.call(entries, key)) return null;
  return entries[key] ?? null;
}

function safeDestination(destination: string): boolean {
  return destination.startsWith("/") && !destination.startsWith("//") && !destination.includes("\\");
}

function entryRedirect(request: Request, url: URL, rule: EntryRule): Response {
  const method = request.method.toUpperCase();
  const headers = new Headers({
    location: `${rule.destination}${url.search}`,
    "cache-control": "private, no-store",
  });
  const human =
    (method === "GET" || method === "HEAD") &&
    !isPrefetch(request) &&
    !isBotUserAgent(request.headers.get("user-agent"));
  if (human) {
    headers.append("set-cookie", buildSetCookie(FF_ENTRY_COOKIE, rule.entry, FF_ENTRY_MAX_AGE_SECONDS));
  }
  return new Response(null, { status: 308, headers });
}

/** Vercel calls middleware(request, context). A plain rule map is a test injection. */
function entryTable(value: unknown): Readonly<Record<string, EntryRule>> {
  if (!value || typeof value !== "object") return ENTRY_REDIRECTS;
  const record = value as Record<string, unknown>;
  if (typeof record.waitUntil === "function") return ENTRY_REDIRECTS;
  for (const rule of Object.values(record)) {
    if (!rule || typeof rule !== "object") return ENTRY_REDIRECTS;
    const candidate = rule as { destination?: unknown; entry?: unknown };
    if (typeof candidate.destination !== "string" || typeof candidate.entry !== "string") {
      return ENTRY_REDIRECTS;
    }
    if (!safeDestination(candidate.destination)) return ENTRY_REDIRECTS;
  }
  return record as Readonly<Record<string, EntryRule>>;
}

export default function middleware(request: Request, entriesMaybe?: unknown): Response {
  const url = new URL(request.url);
  const rule = entryRedirectFor(url.pathname, entryTable(entriesMaybe));
  if (rule && safeDestination(rule.destination)) return entryRedirect(request, url, rule);

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return continueWithoutChange();
  if (!isCanonicalHtmlPath(url.pathname)) return continueWithoutChange();
  if (isPrefetch(request)) return continueWithoutChange();
  if (isBotUserAgent(request.headers.get("user-agent"))) {
    return continueWithoutChange([buildSetCookie(FF_BOT_COOKIE, "1", FF_BOT_MAX_AGE_SECONDS)]);
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const existingVisitor = readPrimaryCookie(cookies, FF_VID_COOKIE);
  const existingSession = readPrimaryCookie(cookies, FF_SID_COOKIE);
  const visitorId = existingVisitor ?? newIdentityId();
  const sessionId = existingSession ?? newIdentityId();
  if (!visitorId || !sessionId) return continueWithoutChange();

  const setCookies: string[] = [];
  if (!existingVisitor) {
    setCookies.push(buildSetCookie(FF_VID_COOKIE, visitorId, FF_VID_MAX_AGE_SECONDS));
  }
  setCookies.push(buildSetCookie(FF_SID_COOKIE, sessionId, FF_SID_MAX_AGE_SECONDS));
  return continueWithoutChange(setCookies);
}
