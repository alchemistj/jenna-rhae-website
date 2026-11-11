import { describe, expect, it } from "vitest";
import { pages } from "../src/data/pages";
import { publishedRoutes } from "../src/lib/routeRegistry";
import { allPageHtml, normalize } from "./helpers";

const all = allPageHtml();

function between(html: string, re: RegExp): string[] {
  return Array.from(html.matchAll(re), (m) => m[1] ?? "");
}

describe("every built page", () => {
  it("has exactly one H1", () => {
    for (const { path, html } of all) {
      expect(between(html, /<h1[\s>]/g).length, path).toBe(1);
    }
  });

  it("has a unique title and a unique meta description", () => {
    const titles = all.map(({ html }) => between(html, /<title>([^<]*)<\/title>/g)[0]);
    const descriptions = all.map(({ html }) => between(html, /<meta name="description" content="([^"]*)"/g)[0]);
    expect(titles.every(Boolean)).toBe(true);
    expect(descriptions.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const d of descriptions) expect(normalize(d).length).toBeLessThanOrEqual(200);
  });

  it("has a canonical URL on the apex host with a trailing slash", () => {
    for (const { path, html } of all) {
      const [canonical] = between(html, /<link rel="canonical" href="([^"]*)"/g);
      expect(canonical, path).toBe(`https://jennarhae.com${path}`);
      expect(html).toContain(`<meta property="og:url" content="https://jennarhae.com${path}"`);
    }
  });

  it("is not noindex", () => {
    for (const { path, html } of all) {
      expect(html.toLowerCase(), path).not.toMatch(/<meta[^>]+name="robots"[^>]*noindex/);
    }
  });

  it("has valid JSON-LD with no phone, rating or review markup", () => {
    for (const { path, html } of all) {
      const blocks = between(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      expect(blocks.length, path).toBe(1);
      const data = JSON.parse(blocks[0]!);
      expect(data["@context"]).toBe("https://schema.org");
      const text = JSON.stringify(data);
      expect(text, path).not.toMatch(/telephone|aggregateRating|"review"|streetAddress/i);
      const types = data["@graph"].map((n: { "@type": unknown }) => n["@type"]);
      expect(JSON.stringify(types)).toContain("ProfessionalService");
      if (Object.values(pages).find((p) => p.path === path)?.blocks.some((b) => b.type === "faq")) {
        expect(JSON.stringify(types)).toContain("FAQPage");
      }
    }
  });

  it("puts the hero photo first in <body>, ahead of the header, on photo-hero pages", () => {
    for (const route of publishedRoutes.filter((r) => r.photoHero)) {
      const html = all.find((p) => p.path === route.path)!.html;
      const body = html.slice(html.indexOf("<body"));
      const photo = body.indexOf('<img class="atf-photo"');
      const header = body.indexOf("<header");
      const h1 = body.indexOf("<h1");
      const marker = body.indexOf('class="atf-ready"');
      expect(photo, route.path).toBeGreaterThan(-1);
      expect(photo, route.path).toBeLessThan(header);
      expect(header, route.path).toBeLessThan(h1);
      expect(h1, route.path).toBeLessThan(marker);
      // Nothing visible before the photo except the hidden skip link.
      const before = body.slice(0, photo).replace(/<a class="skip-link"[\s\S]*?<\/a>/, "");
      expect(before, route.path).not.toMatch(/<(img|header|nav|h1|section|main)\b/);
    }
  });

  it("inlines one hero AVIF of 35 to 60 KB with the first-frame attributes and no preload", () => {
    for (const route of publishedRoutes.filter((r) => r.photoHero)) {
      const html = all.find((p) => p.path === route.path)!.html;
      const imgs = html.match(/<img class="atf-photo"[^>]*>/g) ?? [];
      expect(imgs.length, route.path).toBe(1);
      const tag = imgs[0]!;
      const data = /src="data:image\/avif;base64,([^"]+)"/.exec(tag)?.[1] ?? "";
      const bytes = Math.floor((data.length * 3) / 4);
      expect(bytes, route.path).toBeGreaterThan(35_000);
      expect(bytes, route.path).toBeLessThan(60_000);
      expect(tag).toContain('loading="eager"');
      expect(tag).toContain('fetchpriority="high"');
      expect(tag).toContain('decoding="sync"');
      expect(tag).toMatch(/width="\d+"/);
      expect(tag).toMatch(/height="\d+"/);
      expect(html).not.toMatch(/<link[^>]+rel="preload"/);
    }
  });

  it("keeps the H1 close to the photo (under 10 KB between the photo and the H1: scrim, header with inline logo and menu)", () => {
    for (const route of publishedRoutes.filter((r) => r.photoHero)) {
      const html = all.find((p) => p.path === route.path)!.html;
      const afterPhoto = html.slice(html.indexOf('class="atf-scrim"'));
      const between = afterPhoto.slice(0, afterPhoto.indexOf("<h1"));
      expect(Buffer.byteLength(between), route.path).toBeLessThan(10_000);
    }
  });

  it("has no third-party iframe or analytics script in the server HTML", () => {
    for (const { path, html } of all) {
      expect(html, path).not.toMatch(/<iframe/i);
      expect(html, path).not.toContain("form_embed.js");
      expect(html, path).not.toMatch(/<script[^>]+src="[^"]*(googletagmanager|springboardcrm|leadconnector)/i);
    }
  });

  it("has a hamburger menu and the Book button, with no phone links", () => {
    for (const { path, html } of all) {
      expect(html, path).toContain("data-menu");
      expect(html, path).toContain("data-mobile-bar");
      expect(html, path).not.toMatch(/href="tel:/i);
    }
  });

  it("points every Book button at #book on pages with the embed and /contact/#book elsewhere", () => {
    for (const route of publishedRoutes) {
      const html = all.find((p) => p.path === route.path)!.html;
      const hrefs = Array.from(html.matchAll(/<a href="([^"]*)"[^>]*data-book/g), (m) => m[1]);
      expect(hrefs.length, route.path).toBeGreaterThan(0);
      const expected = route.hasBooking ? "#book" : "/contact/#book";
      for (const href of hrefs) expect(href, route.path).toBe(expected);
      if (route.hasBooking) expect(html, route.path).toContain('id="book"');
      else expect(html, route.path).not.toContain('id="book"');
    }
  });

  it("registry hasBooking matches the booking block in the page data", () => {
    for (const route of publishedRoutes) {
      const page = pages[route.path];
      expect(page, route.path).toBeDefined();
      expect(page!.blocks.some((b) => b.type === "booking"), route.path).toBe(route.hasBooking === true);
    }
  });
});
