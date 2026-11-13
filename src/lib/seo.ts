import { SITE_NAME, SITE_URL, EMAIL } from "./site";
import type { FaqItem } from "../data/types";

export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Strip the inline `<em>` markup the copy files allow. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export interface JsonLdInput {
  path: string;
  title: string;
  description: string;
  logoUrl: string;
  breadcrumbLabel?: string;
  faq?: FaqItem[];
  article?: {
    headline: string;
    datePublished: string;
    dateModified: string;
    authorName: string;
    imageUrl?: string;
  };
}

/**
 * Organization data comes from the brief. No phone, no street address, no ratings or reviews.
 * The Organization is described on every page, with a BreadcrumbList on inner pages and FAQPage where the page has FAQs.
 */
export function buildJsonLd(input: JsonLdInput): Record<string, unknown> {
  const org = {
    "@type": ["ProfessionalService", "Organization"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: input.logoUrl,
    image: input.logoUrl,
    email: EMAIL,
    description:
      "JennaRhae is a faith-integrated Christian life coaching practice led by Jenna White, MA, Certified Biblical Counselor.",
    founder: { "@type": "Person", name: "Jenna White", honorificSuffix: "MA", jobTitle: "Certified Biblical Counselor" },
    areaServed: { "@type": "Country", name: "United States" },
  };

  const graph: Record<string, unknown>[] = [org];

  graph.push({
    "@type": "WebPage",
    "@id": `${canonicalUrl(input.path)}#webpage`,
    url: canonicalUrl(input.path),
    name: input.title,
    description: input.description,
    isPartOf: { "@id": `${SITE_URL}/#organization` },
  });

  if (input.path !== "/") {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: input.breadcrumbLabel ?? input.title, item: canonicalUrl(input.path) },
      ],
    });
  }

  if (input.article) {
    graph.push({
      "@type": ["BlogPosting", "Article"],
      headline: input.article.headline,
      datePublished: input.article.datePublished,
      dateModified: input.article.dateModified,
      author: { "@type": "Person", name: input.article.authorName },
      ...(input.article.imageUrl ? { image: input.article.imageUrl } : {}),
      mainEntityOfPage: canonicalUrl(input.path),
      url: canonicalUrl(input.path),
    });
  }

  if (input.faq && input.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: input.faq.map((item) => ({
        "@type": "Question",
        name: plainText(item.q),
        acceptedAnswer: { "@type": "Answer", text: plainText(Array.isArray(item.a) ? item.a.join(" ") : item.a) },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
