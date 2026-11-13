import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOOKING_EMBED_HEIGHT, BOOKING_EMBED_HEIGHT_MOBILE, BOOKING_FRAME_ID, FORM_EMBED_URL, QUIZ_URL } from "../src/lib/site";
import { DIST, walk } from "./helpers";

const files = walk(DIST);
const textFiles = files.filter((f) => /\.(html|txt|xml|json|svg|js|css|webmanifest)$/.test(f));
const read = (f: string) => readFileSync(f, "utf8");

describe("no phone numbers in dist", () => {
  // US-style numbers: (816) 555-1234, 816-555-1234, 816.555.1234, +1 816 555 1234, 8165551234 and tel: links.
  const PHONE = [
    /\(\s*\d{3}\s*\)\s*\d{3}[-.\s]?\d{4}/,
    /(?<![\d.])\d{3}[-.\s]\d{3}[-.\s]\d{4}(?![\d.])/,
    /\+1[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/,
    /tel:/i,
    /"telephone"/i,
  ];

  it("finds none in html, txt, xml, json or svg", () => {
    const hits: string[] = [];
    for (const file of textFiles.filter((f) => /\.(html|txt|xml|json|svg)$/.test(f))) {
      // Strip data URIs (base64 images) before scanning.
      const content = read(file).replace(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g, "");
      for (const re of PHONE) if (re.test(content)) hits.push(`${path.relative(DIST, file)} ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it("the phone patterns do catch phone numbers (guards the test itself)", () => {
    expect(PHONE.some((re) => re.test("Call (816) 555-1234 today"))).toBe(true);
    expect(PHONE.some((re) => re.test("816-555-1234"))).toBe(true);
    expect(PHONE.some((re) => re.test('<a href="tel:+18165551234">'))).toBe(true);
    expect(PHONE.some((re) => re.test("G-VSL24X5BJM and 2025"))).toBe(false);
  });
});

describe("images and hosts", () => {
  it("has no http (non-TLS) image URL anywhere in dist", () => {
    const hits: string[] = [];
    for (const file of textFiles) {
      const content = read(file);
      for (const m of content.matchAll(/http:\/\/[^\s"'<>)]+/g)) {
        // xmlns declarations are namespaces, not requests.
        if (/^http:\/\/www\.w3\.org\//.test(m[0]) || /^http:\/\/www\.sitemaps\.org\//.test(m[0])) continue;
        hits.push(`${path.relative(DIST, file)} ${m[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("loads images only from the site itself (no hotlinked WordPress, Lovable, R2 or Supabase images)", () => {
    for (const file of textFiles) {
      const content = read(file).replace(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g, "");
      expect(content, file).not.toMatch(/wp-content|lovable|r2\.dev|supabase\.co|googleusercontent/i);
      for (const m of content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
        const src = m[1]!;
        expect(src.startsWith("/") || src.startsWith("data:"), `${path.relative(DIST, file)} img ${src}`).toBe(true);
      }
      for (const m of content.matchAll(/srcset="([^"]+)"/g)) {
        for (const candidate of m[1]!.split(",")) {
          expect(candidate.trim().startsWith("/"), `${path.relative(DIST, file)} srcset ${candidate}`).toBe(true);
        }
      }
    }
  });

  it("uses https absolute URLs only on the apex host for canonical, og:image and JSON-LD", () => {
    for (const file of files.filter((f) => f.endsWith("index.html"))) {
      const html = read(file);
      for (const m of html.matchAll(/property="og:image" content="([^"]+)"/g)) {
        expect(m[1]!.startsWith("https://jennarhae.com/_astro/")).toBe(true);
      }
      expect(html).not.toContain("https://www.jennarhae.com");
    }
  });

  it("does not load Google Fonts or other external stylesheets", () => {
    for (const file of files.filter((f) => f.endsWith(".html"))) {
      const html = read(file);
      expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
      expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    }
  });

  it("references third-party embeds only through data-src and the noscript link", () => {
    const home = read(path.join(DIST, "index.html"));
    expect(home).toContain('data-src="https://link.springboardcrm.com/widget/booking/5JgMZbYOgzpSpNXbNZCA"');
    expect(home).toMatch(/<noscript>\s*<p[^>]*><a [^>]*href="https:\/\/link\.springboardcrm\.com\/widget\/booking\/5JgMZbYOgzpSpNXbNZCA"/);
    expect(home).not.toMatch(/<iframe/i);
    expect(home).not.toContain("form_embed.js");
    expect(home).toContain('data-autosize="true"');
    expect(home).toContain(`data-frame-id="${BOOKING_FRAME_ID}"`);
    expect(home).toContain("deferred-embed-bare");
    expect(home).toContain(`--embed-h: ${BOOKING_EMBED_HEIGHT}px`);
    expect(home).toContain(`--embed-h-mobile: ${BOOKING_EMBED_HEIGHT_MOBILE}px`);
  });

  it("ships the booking resizer in the deferred loader only, never in server HTML", () => {
    for (const file of files.filter((f) => f.endsWith(".html"))) {
      const html = read(file);
      expect(html, path.relative(DIST, file)).not.toContain("form_embed.js");
      expect(html, path.relative(DIST, file)).not.toMatch(/<iframe/i);
      expect(html, path.relative(DIST, file)).not.toMatch(/<script[^>]+src="[^"]*springboardcrm/i);
    }
    const js = files.filter((f) => f.endsWith(".js")).map(read).join("\n");
    expect(js).toContain(FORM_EMBED_URL);
    const quizPage = read(path.join(DIST, "free-trauma-test", "index.html"));
    const quiz = quizPage.slice(quizPage.indexOf('id="trauma-quiz"'), quizPage.indexOf('id="book"'));
    expect(quiz).toContain('class="deferred-embed"');
    expect(quiz).not.toContain("deferred-embed-bare");
    expect(quiz).not.toContain("data-autosize");
    expect(quiz).toContain(`data-src="${QUIZ_URL}"`);
  });
});

describe("analytics and form bundles", () => {
  const js = files.filter((f) => f.endsWith(".js") && f.includes("_astro")).map(read).join("\n");
  const html = files.filter((f) => f.endsWith(".html")).map(read).join("\n");
  const everything = js + html;

  it("includes the delayed GA4 loader with the right id and no ads or GTM", () => {
    expect(everything).toContain("G-VSL24X5BJM");
    expect(everything).toContain("googletagmanager.com/gtag/js");
    expect(everything).not.toMatch(/GTM-[A-Z0-9]+|AW-\d+|googleadservices/);
  });

  it("includes the literal Central Forms endpoint, site key and form key", () => {
    expect(everything).toContain("https://forms.fluidframemarketing.com/api/lead");
    expect(everything).toContain("jenna-rhae-website");
    expect(everything).toContain("main-contact");
    expect(everything).toContain("generate_lead");
  });

  it("renders the contact form in the server HTML with a honeypot and an unchecked SMS consent box", () => {
    const contact = read(path.join(DIST, "contact", "index.html"));
    expect(contact).toContain("data-lead-form");
    expect(contact).toContain('name="website_url"');
    const consent = /<input[^>]*name="sms_consent"[^>]*>/.exec(contact)?.[0] ?? "";
    expect(consent).toContain('type="checkbox"');
    expect(consent).not.toContain("checked");
    for (const href of ["/privacy/", "/terms/", "/text-messaging-terms/"]) {
      expect(contact).toContain(`href="${href}"`);
    }
    expect(contact).toMatch(/data-submit[^>]*disabled|disabled[^>]*data-submit/);
    expect(contact).toContain("mailto:hello@jennarhae.com");
    for (const file of textFiles) {
      expect(read(file), path.relative(DIST, file)).not.toContain("info@jennarhae.com");
    }
  });
});

describe("former name", () => {
  const aboutSentence = "Many people have previously known me professionally as Jenna Barbosa,";

  it("keeps Barbosa only in the About sentence that explains her former name", () => {
    const hits: string[] = [];
    for (const file of files) {
      const content = read(file).replace(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g, "");
      if (/barbosa/i.test(content.split(aboutSentence).join(""))) hits.push(path.relative(DIST, file));
    }
    expect(hits).toEqual([]);
    expect(read(path.join(DIST, "about", "index.html"))).toContain(aboutSentence);
  });
});
