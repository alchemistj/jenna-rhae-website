/**
 * Site chrome copy (header, footer, mobile bar, booking section). Word for word from the Lovable mockup
 * (src/components/site-header.tsx, site-footer.tsx, cta-button.tsx).
 * Strings marked "a11y" are not in the mockup: they are hidden labels for assistive technology.
 */
import type { BookingCopy } from "./types";

export const brand = {
  /** Wordmark text. The first letter is drawn in the accent color. */
  wordmark: "JENNARHAE",
  logoAlt: "JennaRhae — Jenna White, Christian Life Coach",
};

export const bookLabel = "Book a Free Consultation Call";

export const header = {
  /** Nav links. Items whose route is pending in the route registry are not rendered. */
  nav: [
    { href: "/", label: "Home" },
    { href: "/trauma-recovery-coaching/", label: "Trauma Coaching" },
    { href: "/christian-life-coach-kansas-city-mo/", label: "Kansas City Coaching" },
    { href: "/about/", label: "About" },
    { href: "/blog/", label: "Blog" },
    { href: "/contact/", label: "Contact" },
  ],
  bookLong: "Book a Free Call",
  bookShort: "Book Call",
  /** a11y */
  menuLabel: "Menu",
  /** a11y */
  skipLink: "Skip to content",
  /** a11y */
  navLabel: "Main",
};

export const mobileBar = {
  label: "Book a Free Consultation Call",
};

export const footer = {
  about:
    "JennaRhae is a faith-integrated coaching practice helping women leave survival mode and find safety in body, mind, and soul. Led by Jenna White, MA, Certified Biblical Counselor.",
  bookLink: "Book a Free Consultation",
  appointment: "By Appointment",
  servicesHeading: "Services",
  services: [
    "Trauma Recovery Coaching",
    "Christian Life Coaching",
    "Christian Coaching in Kansas City, MO",
    "Faith-Based Emotional Freedom Coaching",
    "Secure Singleness Course",
    "Tenacious Grace (Emotional Eating)",
    "Free Consultation Call",
  ],
  servingHeading: "Serving Women",
  serving: [
    "Online — Nationwide",
    "Kansas City, MO",
    "St. Louis, MO",
    "Springfield, MO",
    "Columbia, MO",
    "Women in Survival Mode",
    "Faith-Integrated Healing",
    "Trauma Recovery",
  ],
  whyHeading: "Why Choose Jenna White",
  why: [
    "Jenna White, MA — Certified Biblical Counselor",
    "Emotional Freedom Life Coach",
    "Trained at Light University (AACC)",
    "Faith-Integrated, Trauma-Informed Approach",
    "Online Sessions — Available Nationwide",
    "In-Person Available in Kansas City, MO",
    "Free Consultation Call — No Pressure",
  ],
  copyright: "© 2025 JennaRhae.com | All Rights Reserved",
  legal: [
    { href: "/privacy/", label: "Privacy Policy" },
    { href: "/terms/", label: "Terms of Service" },
    { href: "/text-messaging-terms/", label: "Text Messaging Terms" },
  ],
  tagline: "Jenna White — Christian Life Coach — Kansas City, MO",
};

/**
 * The booking section is not in the mockup (it is a link there). The heading reuses the mockup's primary
 * button label. The other strings are a11y or fallback text.
 */
export const booking: BookingCopy = {
  heading: "Book a Free Consultation Call",
  iframeTitle: "Book a free consultation call with Jenna White",
  noscript: "Open the booking calendar",
};
