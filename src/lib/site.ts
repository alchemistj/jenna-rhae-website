/** Site-wide constants. Nothing visible to visitors lives here (that is src/data). */
export const SITE_URL = "https://jennarhae.com";
export const SITE_NAME = "JennaRhae";
export const SITE_HOST = "jennarhae.com";
export const EMAIL = "hello@jennarhae.com";
export const MAILTO = `mailto:${EMAIL}`;

export const BOOKING_URL = "https://link.springboardcrm.com/widget/booking/5JgMZbYOgzpSpNXbNZCA";
export const QUIZ_URL = "https://api.leadconnectorhq.com/widget/quiz/yXQ8xBBTLGV4uQCjRI0i";

export const GA_MEASUREMENT_ID = "G-VSL24X5BJM";

/** Anchor id of the booking embed. Book buttons on a page that has the embed jump here. */
export const BOOKING_ANCHOR = "book";

/** Where Book buttons go on a page without the embed. */
export const BOOKING_FALLBACK_HREF = `/contact/#${BOOKING_ANCHOR}`;

export function bookHref(hasBooking: boolean): string {
  return hasBooking ? `#${BOOKING_ANCHOR}` : BOOKING_FALLBACK_HREF;
}

/** Central Forms (SOP central-forms-contact-form.md section 4e). */
export const FORMS = {
  leadUrl: "https://forms.fluidframemarketing.com/api/lead",
  siteKey: "jenna-rhae-website",
  formKey: "main-contact",
  productionHosts: ["jennarhae.com"] as readonly string[],
} as const;
