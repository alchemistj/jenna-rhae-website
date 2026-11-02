import { describe, expect, it } from "vitest";
import { pages } from "../src/data/pages";
import * as site from "../src/data/site";
import { collectStrings, decodeEntities, NON_COPY_KEYS, normalize, readPage, textOf } from "./helpers";

/**
 * Copy test: every string in src/data/pages (and the shared chrome in src/data/site.ts) appears in the built HTML,
 * word for word. A string passes if it is in the visible text or in the raw markup (attributes such as
 * the title, meta description and image alt). Inline <em> from the copy files is compared as text.
 */
function check(strings: { key: string; value: string }[], html: string) {
  const text = textOf(html);
  const raw = normalize(html);
  const missing: string[] = [];
  for (const { key, value } of strings) {
    if (NON_COPY_KEYS.has(key)) continue;
    const plain = normalize(value.replace(/<[^>]+>/g, ""));
    const asMarkup = normalize(value);
    if (!text.includes(plain) && !raw.includes(asMarkup) && !raw.includes(plain)) {
      missing.push(`${key}: ${value}`);
    }
  }
  return missing;
}

describe("copy appears word for word in the built HTML", () => {
  for (const page of Object.values(pages)) {
    it(`${page.path} has all of its data strings`, () => {
      const html = readPage(page.path);
      expect(check(collectStrings(page), html)).toEqual([]);
    });
  }

  it("shared chrome copy (src/data/site.ts) appears on the home page", () => {
    const html = readPage("/");
    const strings = collectStrings({
      brand: site.brand,
      header: site.header,
      mobileBar: site.mobileBar,
      footer: site.footer,
      booking: site.booking,
    });
    // Nav labels for pending routes (About, Blog) are intentionally not rendered.
    const pendingLabels = new Set(["About", "Blog"]);
    const filtered = strings.filter((s) => !(s.key === "label" && pendingLabels.has(s.value)));
    expect(check(filtered, html)).toEqual([]);
  });

  it("decodes entities the way browsers do (guards the test itself)", () => {
    expect(decodeEntities("Jenna&#39;s &amp; &#x201C;quoted&#x201D;")).toBe("Jenna's & “quoted”");
  });

  it("does not ship the mockup's placeholder testimonials", () => {
    for (const page of Object.keys(pages)) {
      const html = readPage(page);
      expect(html).not.toContain("Pending client approval");
      expect(html).not.toContain("What Women Are Saying");
      expect(html).not.toContain("Form functionality added after approval");
    }
  });
});
