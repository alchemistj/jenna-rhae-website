/**
 * WordPress pages and posts, word for word from src/data/wp.
 * Page images sit beside the neighboring text, alternating sides.
 * Inside a post, images stay where the author put them.
 */
import type { Block, PageData, WpRun } from "../types";
import type { ImageKey } from "../../lib/images";
import { QUIZ_URL } from "../../lib/site";
import { renderInline } from "../../lib/inlineMarkdown";
import { resolveAlt } from "../../lib/wpAlt";
import { formatWpDate } from "../../lib/wpDate";
import aboutJson from "../wp/about.json";
import blogJson from "../wp/blog.json";
import freeTraumaTestJson from "../wp/free-trauma-test.json";
import tenaciousGraceJson from "../wp/tenacious-grace.json";
import howToTrustJson from "../wp/how-to-trust-after-trauma.json";
import whatToDoJson from "../wp/what-to-do-after-trauma.json";
import nightmaresJson from "../wp/trauma-nightmares.json";
import griefJson from "../wp/is-grief-trauma.json";
import complexJson from "../wp/what-causes-complex-trauma.json";
import coachJson from "../wp/what-does-a-trauma-coach-do.json";

interface WpImage {
  type: "image";
  src: string;
  alt: string;
  decorative?: boolean;
}

type WpSection =
  | { type: "h2" | "h3" | "h4" | "quote"; text: string }
  /** A WordPress paragraph. An array is one long paragraph split between sentences (scripts/qa/paragraphs.mjs). */
  | { type: "p"; text: string | string[] }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "cta"; text: string; href: string; newTab?: boolean }
  | { type: "embed"; kind: string; src: string; title: string }
  | WpImage;

interface WpAuthor {
  name: string;
  bio: string;
  image: WpImage;
}

interface WpPostCard {
  url: string;
  title: string;
  publishedDate: string;
  listingDate: string | null;
  excerpt: string;
  readMoreLabel: string;
  featuredImage: WpImage;
  onLiveListing: boolean;
}

interface WpDoc {
  url: string;
  type: "page" | "post";
  title: string;
  metaDescription: string;
  h1: string | null;
  publishedDate?: string;
  modifiedDate: string;
  readingTime?: string;
  featuredImage: WpImage | null;
  author: WpAuthor | null;
  sections: WpSection[];
  posts?: WpPostCard[];
}

const SRC_TO_KEY = {
  "src/assets/wp/flower-icon.png": "wp-flower-icon",
  "src/assets/wp/jennarhae-trauma-coach.jpg": "wp-jennarhae-trauma-coach",
  "src/assets/wp/facts-about-jenna.jpg": "wp-facts-about-jenna",
  "src/assets/wp/christian-life-coach.jpg": "wp-christian-life-coach",
  "src/assets/wp/jenna-white-author.jpg": "wp-jenna-white-author",
  "src/assets/wp/what-causes-complex-trauma.jpg": "wp-what-causes-complex-trauma",
  "src/assets/wp/tenacious-grace.avif": "wp-tenacious-grace",
  "src/assets/wp/trauma-coaching.jpg": "wp-trauma-coaching",
  "src/assets/wp/jenna-quotes.png": "wp-jenna-quotes",
  "src/assets/wp/trauma-nightmares.png": "wp-trauma-nightmares",
  "src/assets/wp/how-to-trust-after-trauma.jpg": "wp-how-to-trust-after-trauma",
  "src/assets/wp/how-to-retrain-your-brain-after-trauma.jpg": "wp-how-to-retrain-your-brain-after-trauma",
  "src/assets/wp/is-grief-trauma.jpg": "wp-is-grief-trauma",
} as const satisfies Record<string, ImageKey>;

function imageKey(src: string): ImageKey {
  const key = SRC_TO_KEY[src as keyof typeof SRC_TO_KEY];
  if (!key) throw new Error(`No image key for ${src}`);
  return key;
}

function isImage(section: WpSection): section is WpImage {
  return section.type === "image";
}

/** One section as runs. A split paragraph gives one run per part; everything else gives one run. */
function toRuns(section: WpSection): WpRun[] {
  if (section.type === "p") {
    const parts = Array.isArray(section.text) ? section.text : [section.text];
    return parts.map((text) => ({ type: "p", html: renderInline(text) }));
  }
  return [toRun(section)];
}

function toRun(section: WpSection): WpRun {
  if (section.type === "p") throw new Error("Use toRuns for paragraphs");
  if (section.type === "h2" || section.type === "h3" || section.type === "h4") {
    return { type: section.type, html: renderInline(section.text) };
  }
  if (section.type === "ul" || section.type === "ol") {
    return { type: section.type, items: section.items.map((item) => renderInline(item)) };
  }
  if (section.type === "image") {
    return { type: "image", image: imageKey(section.src), alt: resolveAlt(section) };
  }
  if (section.type === "cta") {
    return { type: "cta", html: renderInline(section.text), href: section.href, newTab: section.newTab === true };
  }
  throw new Error(`Unsupported WordPress section ${section.type}`);
}

function seo(doc: WpDoc, ogImage?: ImageKey): PageData["seo"] {
  return {
    title: doc.title,
    description: doc.metaDescription,
    ...(ogImage ? { ogImage } : {}),
  };
}

function split(image: WpImage, runs: WpRun[], side: "right" | "left"): Block {
  return { type: "wp-split", image: imageKey(image.src), alt: resolveAlt(image), side, runs };
}

function buildAbout(doc: WpDoc): PageData {
  const flower = doc.sections.find((section) => isImage(section) && section.decorative);
  const photos = doc.sections.filter((section): section is WpImage => isImage(section) && !section.decorative);
  const paragraphs = doc.sections.filter((section) => section.type === "p");
  const heading = doc.sections.find((section) => section.type === "h4");
  const list = doc.sections.find((section) => section.type === "ul");
  if (!flower || !isImage(flower) || photos.length !== 3 || paragraphs.length !== 8 || !heading || !list) {
    throw new Error("about.json no longer matches the page builder");
  }
  const [portrait, wedding, facts] = photos as [WpImage, WpImage, WpImage];
  if (!doc.h1) throw new Error("about.json is missing its H1");
  return {
    path: doc.url,
    seo: seo(doc, imageKey(portrait.src)),
    h1: doc.h1,
    blocks: [
      { type: "decor", image: imageKey(flower.src), alt: "" },
      split(portrait, paragraphs.slice(0, 3).flatMap(toRuns), "right"),
      split(wedding, paragraphs.slice(3, 6).flatMap(toRuns), "left"),
      split(facts, [toRun(heading), toRun(list), ...paragraphs.slice(6).flatMap(toRuns)], "right"),
    ],
  };
}

function buildTenacious(doc: WpDoc): PageData {
  const heading = doc.sections.find((section) => section.type === "h2");
  const photo = doc.sections.find((section): section is WpImage => isImage(section));
  const paragraphs = doc.sections.filter((section) => section.type === "p");
  const cta = doc.sections.find((section) => section.type === "cta");
  if (!heading || !photo || paragraphs.length !== 2 || !cta || !doc.h1) {
    throw new Error("tenacious-grace.json no longer matches the page builder");
  }
  return {
    path: doc.url,
    seo: seo(doc, imageKey(photo.src)),
    h1: doc.h1,
    blocks: [
      split(photo, [toRun(heading), ...paragraphs.flatMap(toRuns)], "right"),
      { type: "wp", runs: [toRun(cta)] },
    ],
  };
}

function buildQuiz(doc: WpDoc): PageData {
  const embed = doc.sections.find((section) => section.type === "embed");
  if (!embed || embed.type !== "embed" || embed.kind !== "quiz" || embed.src !== QUIZ_URL) {
    throw new Error("free-trauma-test.json quiz embed does not match QUIZ_URL");
  }
  return {
    path: doc.url,
    seo: seo(doc),
    h1: "Free Trauma Test",
    blocks: [
      { type: "quiz", title: "Free trauma test", noscriptLabel: "Open the free trauma test" },
      { type: "booking" },
    ],
  };
}

function buildBlog(doc: WpDoc): PageData {
  const posts = doc.posts ?? [];
  if (posts.length !== 6 || !doc.h1) throw new Error("blog.json must list all 6 posts");
  return {
    path: doc.url,
    seo: seo(doc),
    h1: doc.h1,
    blocks: [
      {
        type: "blog-list",
        posts: posts.map((post) => ({
          href: post.url,
          title: post.title,
          date: post.listingDate ?? formatWpDate(post.publishedDate),
          excerptHtml: renderInline(post.excerpt),
          readMore: post.readMoreLabel,
          image: imageKey(post.featuredImage.src),
          alt: resolveAlt(post.featuredImage),
        })),
      },
    ],
  };
}

function buildPost(doc: WpDoc): PageData {
  if (!doc.h1 || !doc.author || !doc.featuredImage || !doc.publishedDate || !doc.readingTime) {
    throw new Error(`${doc.url} is missing post fields`);
  }
  const featuredKey = imageKey(doc.featuredImage.src);
  return {
    path: doc.url,
    seo: seo(doc, featuredKey),
    h1: doc.h1,
    article: {
      headline: doc.h1,
      datePublished: doc.publishedDate,
      dateModified: doc.modifiedDate,
      authorName: doc.author.name,
      image: featuredKey,
    },
    blocks: [
      {
        type: "post-meta",
        date: formatWpDate(doc.publishedDate),
        readingTime: doc.readingTime,
        authorName: doc.author.name,
        image: featuredKey,
        alt: resolveAlt(doc.featuredImage),
      },
      { type: "wp", runs: doc.sections.flatMap(toRuns) },
      {
        type: "author",
        name: doc.author.name,
        bioHtml: renderInline(doc.author.bio),
        image: imageKey(doc.author.image.src),
        alt: resolveAlt(doc.author.image),
      },
      { type: "closing-book" },
    ],
  };
}

const about = aboutJson as WpDoc;
const blog = blogJson as WpDoc;
const freeTraumaTest = freeTraumaTestJson as WpDoc;
const tenaciousGrace = tenaciousGraceJson as WpDoc;
const posts = [howToTrustJson, whatToDoJson, nightmaresJson, griefJson, complexJson, coachJson] as WpDoc[];

export const wordpressPages: PageData[] = [
  buildAbout(about),
  buildTenacious(tenaciousGrace),
  buildQuiz(freeTraumaTest),
  buildBlog(blog),
  ...posts.map(buildPost),
];
