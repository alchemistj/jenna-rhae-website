import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pages } from "../src/data/pages";
import { buildLlms, buildRobots, buildSitemap } from "../src/lib/seoFiles";
import { isPublished, pendingRoutes, publishedRoutes, routes } from "../src/lib/routeRegistry";
import { DIST, allPageHtml, pageFile, walk } from "./helpers";

const WORDPRESS = [
  "/about/",
  "/blog/",
  "/free-trauma-test/",
  "/tenacious-grace/",
  "/what-does-a-trauma-coach-do/",
  "/what-causes-complex-trauma/",
  "/is-grief-trauma/",
  "/what-to-do-after-trauma/",
  "/trauma-nightmares/",
  "/how-to-trust-after-trauma/",
];

function locs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]!);
}

describe("route registry", () => {
  it("has unique paths, all with leading and trailing slashes", () => {
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^\/([a-z0-9-]+\/)*$/);
  });

  it("publishes the WordPress pages and the 6 posts", () => {
    expect(pendingRoutes).toEqual([]);
    for (const p of WORDPRESS) expect(isPublished(p), p).toBe(true);
  });

  it("has page data for every published route and none for pending ones", () => {
    expect(Object.keys(pages).sort()).toEqual(publishedRoutes.map((r) => r.path).sort());
  });

  it("builds a page for every published route and none for pending routes", () => {
    for (const r of publishedRoutes) expect(existsSync(pageFile(r.path)), r.path).toBe(true);
    for (const r of pendingRoutes) expect(existsSync(pageFile(r.path)), r.path).toBe(false);
    const built = walk(DIST)
      .filter((f) => f.endsWith("index.html"))
      .map((f) => path.relative(DIST, path.dirname(f)).split(path.sep).join("/"))
      .map((rel) => (rel === "" ? "/" : `/${rel}/`));
    expect(built.sort()).toEqual(publishedRoutes.map((r) => r.path).sort());
  });
});

describe("sitemap.xml, robots.txt and llms.txt agree with the registry", () => {
  const sitemap = readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  const robots = readFileSync(path.join(DIST, "robots.txt"), "utf8");
  const llms = readFileSync(path.join(DIST, "llms.txt"), "utf8");
  const expected = publishedRoutes.map((r) => `https://jennarhae.com${r.path}`).sort();

  it("sitemap lists exactly the published routes", () => {
    expect(locs(sitemap).sort()).toEqual(expected);
    for (const p of WORDPRESS) expect(sitemap).toContain(`https://jennarhae.com${p}`);
    expect(sitemap).toBe(buildSitemap());
  });

  it("robots.txt allows crawling and points at the apex sitemap", () => {
    expect(robots).toBe(buildRobots());
    expect(robots).toContain("Sitemap: https://jennarhae.com/sitemap.xml");
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it("llms.txt lists exactly the published routes", () => {
    const urls = Array.from(llms.matchAll(/\]\((https:\/\/jennarhae\.com[^)]*)\)/g), (m) => m[1]!);
    expect(urls.sort()).toEqual(expected);
    for (const p of WORDPRESS) expect(llms).toContain(`https://jennarhae.com${p}`);
    const descriptions = Object.fromEntries(Object.values(pages).map((p) => [p.path, p.seo.description]));
    expect(llms).toBe(buildLlms(descriptions));
  });
});

describe("internal links", () => {
  it("only point at published routes (no pending pages, no unknown paths)", () => {
    const published = new Set(publishedRoutes.map((r) => r.path));
    for (const { path: pagePath, html } of allPageHtml()) {
      const hrefs = Array.from(html.matchAll(/<a [^>]*href="([^"]*)"/g), (m) => m[1]!);
      for (const href of hrefs) {
        if (/^(https?:|mailto:)/.test(href)) continue;
        const [pathname] = href.split("#") as [string];
        if (pathname === "") continue; // same-page anchor
        expect(published.has(pathname), `${pagePath} links to ${href}`).toBe(true);
      }
    }
  });

  it("same-page anchors resolve to an id on that page", () => {
    for (const { path: pagePath, html } of allPageHtml()) {
      const anchors = Array.from(html.matchAll(/<a [^>]*href="#([^"]+)"/g), (m) => m[1]!);
      for (const id of anchors) expect(html, `${pagePath} #${id}`).toContain(`id="${id}"`);
    }
  });

  it("renders About and Blog in the nav once those routes are published", () => {
    for (const { html } of allPageHtml()) {
      expect(html).toContain('href="/about/"');
      expect(html).toContain('href="/blog/"');
    }
  });
});
