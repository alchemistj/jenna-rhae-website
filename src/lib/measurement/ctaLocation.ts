export const CTA_LOCATIONS = [
  "header",
  "mobile_menu",
  "hero",
  "cta_band",
  "main",
  "footer",
  "sticky_bar",
] as const;

export type CtaLocation = (typeof CTA_LOCATIONS)[number];

export function isCtaLocation(value: string | null | undefined): value is CtaLocation {
  return (CTA_LOCATIONS as readonly string[]).includes(value ?? "");
}
