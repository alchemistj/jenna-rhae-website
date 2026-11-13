import { describe, expect, it } from "vitest";
import middleware, {
  ENTRY_REDIRECTS,
  FF_BOT_COOKIE,
  FF_BOT_MAX_AGE_SECONDS,
  FF_ENTRY_COOKIE,
  FF_ENTRY_MAX_AGE_SECONDS,
  FF_SID_COOKIE,
  FF_SID_MAX_AGE_SECONDS,
  FF_VID_COOKIE,
  FF_VID_MAX_AGE_SECONDS,
  config,
  type EntryRule,
} from "../middleware";

const PAGE = "https://jennarhae.com/trauma-coaching/";
const BROWSER =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const TEST_ENTRIES: Record<string, EntryRule> = {
  "/Offer": { destination: "/trauma-coaching/", entry: "test-offer" },
};

function htmlRequest(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (!headers.has("user-agent")) headers.set("user-agent", BROWSER);
  return new Request(url, { ...init, headers });
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function cookieValue(header: string, name: string): string {
  const match = header.match(new RegExp(`^${name}=([^;]+)`));
  expect(match, header).toBeTruthy();
  return decodeURIComponent(match?.[1] ?? "");
}

describe("ff_vid / ff_sid middleware", () => {
  it("declares a matcher that skips api, astro assets, and the text files", () => {
    const matcher = config.matcher.join(" ");
    for (const token of ["api/", "_astro/", "favicon", "robots\\.txt", "sitemap", "llms"]) {
      expect(matcher).toContain(token);
    }
  });

  it("keeps the entry list empty so a new path is one config line", () => {
    expect(ENTRY_REDIRECTS).toEqual({});
    const response = middleware(htmlRequest("https://jennarhae.com/Offer"));
    expect(response.status).toBeLessThan(300);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sets ff_vid and ff_sid on an HTML page and only refreshes ff_sid next time", () => {
    const first = middleware(htmlRequest(PAGE));
    expect(first.headers.get("x-middleware-next")).toBe("1");
    expect(first.headers.get("location")).toBeNull();
    expect(first.headers.get("cache-control")).toBeNull();
    const cookies = setCookies(first);
    expect(cookies).toHaveLength(2);
    const visitor = cookies.find((cookie) => cookie.startsWith(`${FF_VID_COOKIE}=`));
    const session = cookies.find((cookie) => cookie.startsWith(`${FF_SID_COOKIE}=`));
    expect(visitor).toBeTruthy();
    expect(session).toBeTruthy();
    const visitorId = cookieValue(visitor!, FF_VID_COOKIE);
    const sessionId = cookieValue(session!, FF_SID_COOKIE);
    expect(visitorId).toMatch(ID_PATTERN);
    expect(sessionId).toMatch(ID_PATTERN);
    expect(visitorId).not.toBe(sessionId);
    expect(visitor).toBe(
      `${FF_VID_COOKIE}=${visitorId}; Path=/; Max-Age=${FF_VID_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
    );
    expect(session).toBe(
      `${FF_SID_COOKIE}=${sessionId}; Path=/; Max-Age=${FF_SID_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
    );
    expect(visitor).not.toContain("HttpOnly");
    expect(FF_VID_MAX_AGE_SECONDS).toBe(15_552_000);
    expect(FF_SID_MAX_AGE_SECONDS).toBe(1_800);

    const second = middleware(
      htmlRequest(PAGE, {
        headers: { cookie: `${FF_VID_COOKIE}=${visitorId}; ${FF_SID_COOKIE}=${sessionId}` },
      }),
    );
    expect(setCookies(second)).toEqual([
      `${FF_SID_COOKIE}=${sessionId}; Path=/; Max-Age=${FF_SID_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
    ]);
  });

  it("sets the same pair on HEAD and nothing on POST", () => {
    expect(setCookies(middleware(htmlRequest(PAGE, { method: "HEAD" })))).toHaveLength(2);
    const post = middleware(htmlRequest(PAGE, { method: "POST" }));
    expect(post.headers.get("x-middleware-next")).toBe("1");
    expect(setCookies(post)).toEqual([]);
    expect(post.headers.get("cache-control")).toBeNull();
  });

  it("sets nothing on assets, text files, or /api/*", () => {
    const urls = [
      "https://jennarhae.com/api/site-events/",
      "https://jennarhae.com/_astro/app.js",
      "https://jennarhae.com/favicon.svg",
      "https://jennarhae.com/robots.txt",
      "https://jennarhae.com/sitemap.xml",
      "https://jennarhae.com/llms.txt",
      "https://jennarhae.com/trauma-coaching",
    ];
    for (const url of urls) {
      const response = middleware(htmlRequest(url, { headers: { "user-agent": GOOGLEBOT } }));
      expect(setCookies(response), url).toEqual([]);
      expect(response.headers.get("x-middleware-next"), url).toBe("1");
      expect(response.headers.get("cache-control"), url).toBeNull();
    }
  });

  it("sets only ff_bot=1 for a recognized bot", () => {
    const bot = middleware(htmlRequest(PAGE, { headers: { "user-agent": GOOGLEBOT } }));
    expect(bot.headers.get("x-middleware-next")).toBe("1");
    expect(bot.headers.get("cache-control")).toBeNull();
    expect(setCookies(bot)).toEqual([
      `${FF_BOT_COOKIE}=1; Path=/; Max-Age=${FF_BOT_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
    ]);
    expect(FF_BOT_MAX_AGE_SECONDS).toBe(120);

    const lighthouse = middleware(
      htmlRequest(PAGE, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
        },
      }),
    );
    expect(setCookies(lighthouse).every((cookie) => cookie.startsWith(`${FF_BOT_COOKIE}=`))).toBe(true);
    expect(setCookies(lighthouse).some((cookie) => cookie.startsWith(`${FF_VID_COOKIE}=`))).toBe(false);
  });

  it("sets cookies for a CUBOT phone and still marks a user agent whose token is bot", () => {
    const cubot = middleware(
      htmlRequest(PAGE, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 11; CUBOT KINGKONG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        },
      }),
    );
    expect(setCookies(cubot)).toHaveLength(2);

    const word = middleware(
      htmlRequest(PAGE, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; ExampleBot/1.0; +https://example.com/bot)" },
      }),
    );
    expect(setCookies(word)).toEqual([
      `${FF_BOT_COOKIE}=1; Path=/; Max-Age=${FF_BOT_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
    ]);
  });

  it("sets nothing on prefetch", () => {
    const headerSets: HeadersInit[] = [{ purpose: "prefetch" }, { "sec-purpose": "prefetch" }];
    for (const headers of headerSets) {
      const response = middleware(htmlRequest(PAGE, { headers }));
      expect(setCookies(response)).toEqual([]);
    }
  });
});

describe("entry tag", () => {
  it("sends a human a 308 with ff_entry and the query string intact", () => {
    for (const path of ["/Offer", "/Offer/"]) {
      const response = middleware(
        htmlRequest(`https://jennarhae.com${path}?utm_source=gbp&utm_medium=organic&x=a%20b`, {}),
        TEST_ENTRIES,
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("/trauma-coaching/?utm_source=gbp&utm_medium=organic&x=a%20b");
      expect(setCookies(response)).toEqual([
        `${FF_ENTRY_COOKIE}=test-offer; Path=/; Max-Age=${FF_ENTRY_MAX_AGE_SECONDS}; SameSite=Lax; Secure`,
      ]);
      expect(response.headers.get("x-middleware-next")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(FF_ENTRY_MAX_AGE_SECONDS).toBe(1_800);
  });

  it("redirects a bot and a prefetch without a cookie", () => {
    const bot = middleware(htmlRequest("https://jennarhae.com/Offer?a=1", { headers: { "user-agent": GOOGLEBOT } }), TEST_ENTRIES);
    expect(bot.status).toBe(308);
    expect(bot.headers.get("location")).toBe("/trauma-coaching/?a=1");
    expect(setCookies(bot)).toEqual([]);

    const prefetch = middleware(
      htmlRequest("https://jennarhae.com/Offer", { headers: { purpose: "prefetch" } }),
      TEST_ENTRIES,
    );
    expect(prefetch.status).toBe(308);
    expect(setCookies(prefetch)).toEqual([]);
  });

  it("leaves look-alike paths on the normal page path", () => {
    for (const path of ["/offer/", "/OFFER/", "/OfferMeta", "/Offer/extra/", "/constructor", "/__proto__"]) {
      const response = middleware(htmlRequest(`https://jennarhae.com${path}`), TEST_ENTRIES);
      expect(response.status, path).not.toBe(308);
      expect(response.headers.get("location"), path).toBeNull();
    }
  });

  it("ignores a Vercel middleware context passed as the second argument", () => {
    const response = middleware(htmlRequest(PAGE), { waitUntil: () => undefined });
    expect(response.headers.get("location")).toBeNull();
    expect(setCookies(response)).toHaveLength(2);
  });
});
