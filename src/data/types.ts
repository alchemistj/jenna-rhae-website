/**
 * Types for page data files in src/data/pages. All visible copy lives in those files, word for word.
 * Strings may contain `<em>` where the source copy has emphasis. Nothing else.
 */
import type { ImageKey } from "../lib/images";

export type Background = "cream" | "gold" | "charcoal";

export interface Seo {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  /** Image used for og:image. Defaults to the hero image, or the home hero. */
  ogImage?: ImageKey;
}

export interface FaqItem {
  q: string;
  /** One paragraph, or several when a long answer is split between sentences. */
  a: string | string[];
}

export interface ImageData {
  image: ImageKey;
  alt: string;
}

export interface HeroMeta {
  icon: "mail" | "map-pin" | "monitor";
  text: string;
  /** Renders the text as a mailto link. */
  mailto?: boolean;
}

export interface HeroData {
  image: ImageKey;
  imageAlt: string;
  /** CSS object-position for the one inline photo. */
  objectPosition?: string;
  /** 0 to 100. */
  overlayOpacity?: number;
  eyebrow: string;
  title: string;
  /** First line is bold, the rest are normal paragraphs. */
  subtitleBold: string;
  subtitle: string;
  ctaLabel: string;
  meta?: HeroMeta[];
}

export interface CardData {
  title: string;
  body: string;
  /** Internal link. Rendered as a link only when the route is published. */
  href?: string;
  linkLabel?: string;
}

export interface RelatedCard {
  title: string;
  linkLabel: string;
  /** Internal path, or "book" for the booking button. */
  href: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: ImageKey;
  alt: string;
  cta: string;
  /** Link target for the CTA. Plain text while the route is pending. */
  href: string;
}

export interface ArticleItem {
  heading: string;
  paragraphs: string[];
  image?: ImageData;
}

/** One piece of WordPress body content, with inline markdown already rendered to HTML. */
export type WpRun =
  | { type: "p"; html: string }
  | { type: "h2"; html: string }
  | { type: "h3"; html: string }
  | { type: "h4"; html: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "image"; image: ImageKey; alt: string }
  | { type: "cta"; html: string; href: string; newTab?: boolean };

export interface BlogListItem {
  href: string;
  title: string;
  date: string;
  excerptHtml: string;
  readMore: string;
  image: ImageKey;
  alt: string;
}

/** BlogPosting fields. Dates are the WordPress ISO strings. */
export interface ArticleMeta {
  headline: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  image: ImageKey;
}

export type Block =
  | { type: "intro"; text: string | string[] }
  | { type: "plain"; text: string }
  | { type: "quote"; quote: string; paragraphs: string[] }
  | { type: "cards"; bg: Background; eyebrow: string; heading: string; intro?: string; cards: CardData[]; columns?: 2 }
  | { type: "checklist"; bg: Background; eyebrow: string; heading: string; intro: string | string[]; items: string[] }
  | { type: "article"; items: ArticleItem[] }
  | {
      type: "split-list";
      eyebrow: string;
      heading: string;
      items: { title: string; body: string }[];
      image: ImageData;
    }
  | { type: "differentiators"; bg: Background; eyebrow: string; heading: string; items: { title: string; body: string | string[] }[] }
  | { type: "team"; bg: Background; eyebrow: string; heading: string; members: TeamMember[] }
  | { type: "faq"; bg: Background; eyebrow: string; heading: string; items: FaqItem[]; ctaLabel?: string }
  | { type: "band"; heading: string; text: string | string[]; list?: string[] }
  | { type: "related"; eyebrow: string; heading: string; cards: RelatedCard[] }
  | { type: "notice"; bg: Background; text: string }
  | { type: "booking" }
  | { type: "lead-form" }
  | { type: "final-cta"; quote: string; ctaLabel: string }
  | { type: "decor"; image: ImageKey; alt: string }
  | { type: "wp"; runs: WpRun[] }
  | { type: "wp-split"; image: ImageKey; alt: string; side: "right" | "left"; runs: WpRun[] }
  | { type: "quiz"; title: string; noscriptLabel: string }
  | { type: "blog-list"; posts: BlogListItem[] }
  | { type: "post-meta"; date: string; readingTime: string; authorName: string; image: ImageKey; alt: string }
  | { type: "author"; name: string; bioHtml: string; image: ImageKey; alt: string }
  | { type: "closing-book" };

export interface FormCopy {
  eyebrow: string;
  heading: string;
  firstName: { label: string; placeholder: string };
  lastName: { label: string; placeholder: string };
  email: { label: string; placeholder: string };
  phone: { label: string; optional: string; placeholder: string };
  message: { label: string; placeholder: string };
  howHeard: { label: string; placeholder: string; options: string[] };
  /** Label of the CustomFields entry sent to Central Forms. */
  howHeardFieldLabel: string;
  /** Label of the SMS consent entry sent to Central Forms. */
  smsFieldLabel: string;
  /** Accessible label of the hidden honeypot input. */
  honeypotLabel: string;
  smsConsent: { lead: string; links: { label: string; href: string }[] };
  submit: string;
  sending: string;
  success: string;
  invalid: string;
  unconfirmed: string;
  rateLimited: string;
  notProduction: string;
  loading: string;
  noscript: string;
  /** Text around the mailto and booking links in the failure messages. */
  fallbackEmailLead: string;
  fallbackOr: string;
  fallbackBookLabel: string;
}

export interface BookingCopy {
  eyebrow?: string;
  heading: string;
  iframeTitle: string;
  noscript: string;
}

export interface PageData {
  path: string;
  seo: Seo;
  /** Photo hero. Pages without one (legal pages) omit it and carry their own H1 in `h1`. */
  hero?: HeroData;
  h1?: string;
  blocks: Block[];
  /** Form copy, only on pages with a lead-form block. */
  form?: FormCopy;
  /** Set on blog posts. Adds BlogPosting / Article JSON-LD. */
  article?: ArticleMeta;
}
