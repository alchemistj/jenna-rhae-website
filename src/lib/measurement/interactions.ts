import { isContactHref } from "./contactHref";
import { collectContactClick } from "./collect";

/**
 * One journey event per Book button or link to /contact/. The location comes
 * from the element's data-cta-location, set in the component.
 */
export function bindJourneyContactClicks(): () => void {
  if (typeof document === "undefined") return () => undefined;

  const onClick = (event: Event) => {
    const raw = event.target;
    const target =
      raw && typeof (raw as Element).closest === "function"
        ? (raw as Element)
        : ((raw as Node | null)?.parentElement ?? null);
    if (!target || typeof target.closest !== "function") return;
    const link = target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href")?.trim() || "";
    const book = link.hasAttribute("data-book");
    if (!book && !isContactHref(href)) return;
    const ctaLocation = link.getAttribute("data-cta-location")?.trim() || null;
    void collectContactClick({ ctaLocation });
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
