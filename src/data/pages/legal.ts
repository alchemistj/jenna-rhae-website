/**
 * Copy for `/privacy/`, `/terms/` and `/text-messaging-terms/`.
 * Word for word from the mockup, which ships these three as placeholder shells ("Final ... content will be
 * added before launch"). The meta descriptions are not in the mockup: they are short, factual, and exist so
 * each page has a unique description.
 */
import type { PageData } from "../types";

export const privacy = {
  path: "/privacy/",
  seo: {
    title: "Privacy Policy | JennaRhae",
    description: "Privacy Policy for JennaRhae, the Christian life coaching practice of Jenna White, MA.",
  },
  h1: "Privacy Policy",
  blocks: [
    {
      type: "plain",
      text: "This page is a placeholder shell. Final Privacy Policy content will be added before launch.",
    },
  ],
} satisfies PageData;

export const terms = {
  path: "/terms/",
  seo: {
    title: "Terms of Service | JennaRhae",
    description: "Terms of Service for JennaRhae, the Christian life coaching practice of Jenna White, MA.",
  },
  h1: "Terms of Service",
  blocks: [
    {
      type: "plain",
      text: "This page is a placeholder shell. Final Terms of Service content will be added before launch.",
    },
  ],
} satisfies PageData;

export const textMessagingTerms = {
  path: "/text-messaging-terms/",
  seo: {
    title: "Text Messaging Terms | JennaRhae",
    description: "Text Messaging Terms for JennaRhae, the Christian life coaching practice of Jenna White, MA.",
  },
  h1: "Text Messaging Terms",
  blocks: [
    {
      type: "plain",
      text: "This page is a placeholder shell. Final Text Messaging Terms content will be added before launch.",
    },
  ],
} satisfies PageData;
