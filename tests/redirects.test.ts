import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { redirects, wwwRedirect } from "../src/lib/redirects";
import { getRoute, isPublished, routes } from "../src/lib/routeRegistry";
import { ROOT } from "./helpers";

interface VercelRedirect {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
  has?: { type: string; value: string }[];
}

const config = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8")) as {
  trailingSlash?: boolean;
  redirects: VercelRedirect[];
};

describe("vercel.json redirects", () => {
  const pathRedirects = config.redirects.filter((r) => !r.has);

  it("matches src/lib/redirects.ts exactly (both slash forms, 301)", () => {
    const actual = pathRedirects.map((r) => ({ source: r.source, destination: r.destination })).sort(byKey);
    expect(actual).toEqual([...redirects].sort(byKey));
    for (const r of pathRedirects) expect(r.permanent, r.source).toBe(true);
  });

  it("covers the brief: trauma-coaching, life-coach-columbia-mo, feed and comments/feed", () => {
    const map = new Map(pathRedirects.map((r) => [r.source, r.destination]));
    expect(map.get("/trauma-coaching")).toBe("/trauma-recovery-coaching/");
    expect(map.get("/trauma-coaching/")).toBe("/trauma-recovery-coaching/");
    expect(map.get("/life-coach-columbia-mo")).toBe("/christian-life-coach-kansas-city-mo/");
    expect(map.get("/life-coach-columbia-mo/")).toBe("/christian-life-coach-kansas-city-mo/");
    for (const source of ["/feed", "/feed/", "/comments/feed", "/comments/feed/"]) {
      expect(map.get(source), source).toBe("/blog/");
    }
    expect(pathRedirects.length).toBe(8);
  });

  it("sends www.jennarhae.com to the apex in one hop, first in the list", () => {
    const first = config.redirects[0]!;
    expect(first).toEqual(wwwRedirect);
    expect(first.destination).toBe("https://jennarhae.com/$1");
    expect(first.permanent).toBe(true);
  });

  it("redirects only to registered routes and never shadows a live page", () => {
    for (const r of pathRedirects) {
      expect(getRoute(r.destination), r.destination).toBeDefined();
      expect(routes.some((route) => route.path === r.source), r.source).toBe(false);
    }
  });

  it("sends /feed and /comments/feed to the published blog", () => {
    expect(getRoute("/blog/")).toBeDefined();
    expect(isPublished("/blog/")).toBe(true);
    expect(isPublished("/trauma-recovery-coaching/")).toBe(true);
    expect(isPublished("/christian-life-coach-kansas-city-mo/")).toBe(true);
  });

  it("forces trailing slashes", () => {
    expect(config.trailingSlash).toBe(true);
  });
});

function byKey(a: { source: string }, b: { source: string }) {
  return a.source.localeCompare(b.source);
}
