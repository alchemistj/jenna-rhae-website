import { describe, expect, it } from "vitest";
import { pages } from "../src/data/pages";
import type { PageData } from "../src/data/types";
import { isContactHref } from "../src/lib/measurement/contactHref";
import { CTA_LOCATIONS } from "../src/lib/measurement/ctaLocation";
import { allPageHtml } from "./helpers";

function anchors(html: string): string[] {
  return Array.from(html.matchAll(/<a\b[^>]*>/g), (match) => match[0]);
}

function locationOf(tag: string): string | undefined {
  return /data-cta-location="([^"]*)"/.exec(tag)?.[1];
}

function count(html: string, location: string): number {
  return anchors(html).filter((tag) => locationOf(tag) === location).length;
}

function expected(page: PageData) {
  let main = 0;
  let ctaBand = 0;
  for (const block of page.blocks) {
    if (block.type === "faq" && block.ctaLabel) main += 1;
    if (block.type === "final-cta" || block.type === "final-band") ctaBand += 1;
    if (block.type === "cards") {
      for (const card of block.cards) if (card.href && isContactHref(card.href)) main += 1;
    }
    if (block.type === "wp" || block.type === "wp-split") {
      for (const run of block.runs) {
        if (run.type === "cta" && isContactHref(run.href)) main += 1;
        if ("html" in run && run.html) main += run.html.match(/data-cta-location="main"/g)?.length ?? 0;
      }
    }
  }
  return {
    header: 0,
    mobile_menu: 0,
    sticky_bar: 1,
    footer: 3,
    hero: page.hero?.ctaLabel ? 1 : 0,
    main,
    cta_band: ctaBand,
  };
}

describe("cta locations on built pages", () => {
  it("gives every Book button and every contact link a real ctaLocation", () => {
    const seen = new Set<string>();
    for (const { path, html } of allPageHtml()) {
      const page = pages[path];
      expect(page, path).toBeTruthy();
      const want = expected(page!);
      for (const location of CTA_LOCATIONS) {
        expect(count(html, location), `${path} ${location}`).toBe(want[location]);
        if (want[location] > 0) seen.add(location);
      }
      for (const tag of anchors(html)) {
        const href = /href="([^"]*)"/.exec(tag)?.[1] ?? "";
        const book = tag.includes("data-book");
        const contact = isContactHref(href);
        const location = locationOf(tag);
        if (location !== undefined) expect(CTA_LOCATIONS, tag).toContain(location);
        if ((book || contact) && !tag.includes("data-nav-link")) expect(location, `${path} ${tag}`).toBeTruthy();
        if (book) {
          expect(href === "#book" || href === "/contact/#book", `${path} ${href}`).toBe(true);
        }
      }
      expect(html, path).not.toMatch(/<iframe/i);
    }
    const used = CTA_LOCATIONS.filter((location) => location !== "header" && location !== "mobile_menu");
    expect([...seen].sort()).toEqual([...used].sort());
  });
});
