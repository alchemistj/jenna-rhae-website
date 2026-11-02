import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markdownToText, renderInline, rewriteHref } from "../src/lib/inlineMarkdown";
import { QUIZ_URL } from "../src/lib/site";
import { filenameLikeAlt, resolveAlt } from "../src/lib/wpAlt";
import { formatWpDate } from "../src/lib/wpDate";
import { ROOT, allPageHtml, normalize, readPage, textOf } from "./helpers";

const WP = path.join(ROOT, "src", "data", "wp");

interface WpImage {
  type: "image";
  src: string;
  alt: string;
  decorative?: boolean;
}

interface WpSection {
  type: string;
  text?: string;
  items?: string[];
  href?: string;
  src?: string;
  alt?: string;
  decorative?: boolean;
}

interface WpDoc {
  url: string;
  type: string;
  title: string;
  h1: string | null;
  publishedDate?: string;
  modifiedDate?: string;
  author?: { name: string; bio: string; image: WpImage } | null;
  featuredImage?: WpImage | null;
  sections: WpSection[];
  posts?: {
    url: string;
    title: string;
    listingDate: string | null;
    excerpt: string;
    publishedDate: string;
    onLiveListing: boolean;
    featuredImage: WpImage;
  }[];
}

function load(name: string): WpDoc {
  return JSON.parse(readFileSync(path.join(WP, name), "utf8")) as WpDoc;
}

function docs(): { name: string; doc: WpDoc }[] {
  return readdirSync(WP)
    .filter((name) => name.endsWith(".json") && name !== "testimonials.json")
    .map((name) => ({ name, doc: load(name) }));
}

function imagesOf(value: unknown, out: WpImage[] = []): WpImage[] {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const item of value) imagesOf(item, out);
    return out;
  }
  const record = value as { type?: string; src?: string; alt?: string; decorative?: boolean };
  if (record.type === "image" && record.src && record.alt !== undefined) {
    out.push({ type: "image", src: record.src, alt: record.alt, decorative: record.decorative });
  }
  for (const child of Object.values(value)) imagesOf(child, out);
  return out;
}

function expectInOrder(text: string, parts: string[]) {
  let cursor = 0;
  for (const part of parts) {
    const needle = normalize(markdownToText(part));
    const at = text.indexOf(needle, cursor);
    expect(at, needle.slice(0, 80)).toBeGreaterThanOrEqual(0);
    cursor = at + needle.length;
  }
}

describe("WordPress inline markdown", () => {
  it("renders bold, italic, links, and sends #trauma-quiz to the quiz", () => {
    expect(rewriteHref("/trauma-coaching/#trauma-quiz")).toBe("/free-trauma-test/#trauma-quiz");
    expect(renderInline("[**our Trauma Quiz**](/trauma-coaching/#trauma-quiz)")).toBe(
      '<a class="link-accent" href="/free-trauma-test/#trauma-quiz"><strong>our Trauma Quiz</strong></a>',
    );
    expect(renderInline("[take the Trauma Test](/free-trauma-test/)")).toBe(
      '<a class="link-accent" href="/free-trauma-test/">take the Trauma Test</a>',
    );
    expect(renderInline("**scan for safet**y")).toBe("<strong>scan for safet</strong>y");
    expect(markdownToText("**scan for safet**y")).toBe("scan for safety");
    expect(renderInline("line one\nline two")).toBe("line one<br />line two");
  });
});

describe("WordPress copy in the built pages", () => {
  for (const { name, doc } of docs()) {
    if (name === "blog.json") continue;

    it(`${doc.url} includes every paragraph, list item, and heading`, () => {
      const text = textOf(readPage(doc.url));
      if (doc.h1) expect(text).toContain(normalize(doc.h1));
      const ordered: string[] = [];
      for (const section of doc.sections) {
        if (section.type === "p" || section.type === "h2" || section.type === "h3" || section.type === "h4") {
          ordered.push(section.text ?? "");
          expect(text).toContain(normalize(markdownToText(section.text ?? "")));
        }
        if (section.type === "ul" || section.type === "ol") {
          for (const item of section.items ?? []) {
            ordered.push(item);
            expect(text).toContain(normalize(markdownToText(item)));
          }
        }
        if (section.type === "cta") expect(text).toContain(normalize(markdownToText(section.text ?? "")));
      }
      expectInOrder(text, ordered);
      if (doc.author) {
        expect(text).toContain(doc.author.name);
        expect(text).toContain(normalize(markdownToText(doc.author.bio)));
      }
    });
  }

  it("lists all 7 posts on /blog/ and in the sitemap, including the one the live page hides", () => {
    const blog = load("blog.json");
    const html = readPage("/blog/");
    const text = textOf(html);
    const sitemap = readFileSync(path.join(ROOT, "dist", "sitemap.xml"), "utf8");
    expect(blog.posts).toHaveLength(7);
    expect(text).toContain("Blog");
    expect(blog.posts?.some((post) => post.onLiveListing === false)).toBe(true);
    for (const post of blog.posts ?? []) {
      const shownDate = post.listingDate ?? formatWpDate(post.publishedDate);
      expect(text, post.url).toContain(normalize(post.title));
      expect(text, post.url).toContain(normalize(markdownToText(post.excerpt)));
      expect(text, post.url).toContain(shownDate);
      if (post.listingDate != null) expect(formatWpDate(post.publishedDate)).toBe(post.listingDate);
      expect(html, post.url).toContain(`href="${post.url}"`);
      expect(sitemap).toContain(`https://jennarhae.com${post.url}`);
    }
  });

  it("uses Free Trauma Test as the H1 and puts the quiz and booking calendar on that page", () => {
    const html = readPage("/free-trauma-test/");
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    expect(normalize(h1)).toBe("Free Trauma Test");
    expect(html).toContain('id="trauma-quiz"');
    expect(html).toContain(`data-src="${QUIZ_URL}"`);
    expect(html).toContain('id="book"');
    expect(html).not.toMatch(/<iframe/i);
    for (const page of allPageHtml()) {
      expect(page.html, page.path).not.toContain("/trauma-coaching/#trauma-quiz");
    }
    expect(readPage("/is-grief-trauma/")).toContain('href="/free-trauma-test/#trauma-quiz"');
    expect(readPage("/what-causes-complex-trauma/")).toContain('href="/free-trauma-test/#trauma-quiz"');
    expect(readPage("/trauma-nightmares/")).toContain('href="/free-trauma-test/#trauma-quiz"');
  });

  it("links the home cards and keeps the Tenacious Grace button", () => {
    const home = readPage("/");
    expect(home).toContain('href="/tenacious-grace/"');
    expect(home).toContain('href="/free-trauma-test/"');
    expect(home).toContain('href="/about/"');
    const book = readPage("/tenacious-grace/");
    expect(book).toContain('href="https://amzn.to/2UaJEaO"');
    expect(book).toContain('target="_blank"');
    expect(book).toContain("Learn more");
  });

  it("uses the written alt text and keeps the flower decorative", () => {
    for (const { doc } of docs()) {
      const html = readPage(doc.url);
      const images = doc.posts ? doc.posts.map((post) => post.featuredImage) : imagesOf(doc);
      for (const image of images) {
        if (image.decorative) {
          const file = image.src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
          const tag = (html.match(/<img\b[^>]*>/gi) ?? []).find((item) => item.includes(file));
          expect(tag, image.src).toBeTruthy();
          // Astro serializes an empty alt as the boolean attribute `alt`, which is alt="".
          expect(tag, image.src).toMatch(/\salt(?:=""|(?=[\s/>]))/);
          expect(tag, image.src).not.toMatch(/\salt="[^"]/);
          continue;
        }
        const alt = resolveAlt(image);
        expect(alt.length, image.src).toBeGreaterThan(0);
        expect(html, image.src).toContain(`alt="${alt}"`);
        if (image.alt.trim() && filenameLikeAlt(image.alt, image.src)) {
          expect(html, image.src).not.toContain(`alt="${image.alt}"`);
        }
      }
    }
  });

  it("adds BlogPosting dates and the published author name on each post", () => {
    for (const { doc } of docs()) {
      if (doc.type !== "post") continue;
      const html = readPage(doc.url);
      const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "";
      const data = JSON.parse(raw) as { "@graph": { "@type": string | string[]; [key: string]: unknown }[] };
      const article = data["@graph"].find((node) => JSON.stringify(node["@type"]).includes("BlogPosting"));
      expect(article, doc.url).toBeTruthy();
      expect(article?.["datePublished"]).toBe(doc.publishedDate);
      expect(article?.["dateModified"]).toBe(doc.modifiedDate);
      const author = article?.["author"] as { name?: string };
      expect(author.name).toBe(doc.author?.name);
      expect(JSON.stringify(article?.["@type"])).toContain("Article");
      expect(textOf(html)).toContain(doc.author?.name ?? "");
    }
  });
});
