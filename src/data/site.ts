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

/**
 * Real legal text is still a draft. While this is false, the three legal pages stay out of the
 * index and the contact form does not show or submit SMS consent.
 */
export const legalFinal = false;

/** Whether the SMS consent block is shown and submitted. Unit-tested with both flag values. */
export function showSmsConsent(flag: boolean = legalFinal): boolean {
  return flag;
}

export const header = {
  /** Nav links. Items whose route is pending in the route registry are not rendered. */
  nav: [
    { href: "/", label: "Home" },
    { href: "/trauma-coaching/", label: "Trauma Coaching" },
    { href: "/christian-life-coach-kansas-city-mo/", label: "Kansas City Coaching" },
    { href: "/about/", label: "About" },
    { href: "/blog/", label: "Blog" },
    { href: "/contact/", label: "Contact" },
  ],
  /** a11y */
  menuLabel: "Menu",
  /** a11y */
  skipLink: "Skip to content",
  /** a11y */
  navLabel: "Main",
};

export const mobileBar = {
  label: "Book a Free Call",
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

// Draft copy pending Jenna's approval (Nov 20, 2026)
export const finalCta = {
  heading: "You Don't Have to Carry This Alone",
  body: "Start with a free call. We will talk about what you are carrying and what feels hard right now, with no pressure to decide anything.",
  ctaLabel: "Book a Free Consultation Call",
};

// Draft copy pending Jenna's approval (Nov 20, 2026)
export const notFound = {
  title: "Page Not Found | JennaRhae",
  heading: "Let's Get You Back on Track",
  body: "That link has moved or no longer works, and that is okay. Pick a place below to keep going, or reach out if you need help.",
};
