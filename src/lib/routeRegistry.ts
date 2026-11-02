/**
 * Route registry: the single list of every URL on the site.
 * The sitemap, robots.txt, llms.txt, navigation, internal-link checks and tests all read from it.
 *
 * A route with `pending: true` is a WordPress page that another helper still has to build.
 * Pending routes are left out of the sitemap, llms.txt and every rendered link until the flag is removed.
 * A page that is not in the registry is not published and not linked.
 */
export type RouteKind = "page" | "legal" | "post";

export interface RouteEntry {
  /** Path with leading and trailing slash. */
  path: string;
  /** Short label used by navigation and llms.txt. */
  label: string;
  kind: RouteKind;
  /** True until the page is built. Pending routes are never linked, mapped or listed. */
  pending?: boolean;
  /** True when the page carries the deferred SpringboardCRM booking embed (Book buttons jump to #book). */
  hasBooking?: boolean;
  /** True when the page has a photo hero (inline AVIF first in body). */
  photoHero?: boolean;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: number;
}

export const routes: readonly RouteEntry[] = [
  { path: "/", label: "Home", kind: "page", hasBooking: true, photoHero: true, changefreq: "weekly", priority: 1 },
  {
    path: "/trauma-recovery-coaching/",
    label: "Trauma Coaching",
    kind: "page",
    hasBooking: true,
    photoHero: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/christian-life-coach-kansas-city-mo/",
    label: "Kansas City Coaching",
    kind: "page",
    hasBooking: true,
    photoHero: true,
    changefreq: "monthly",
    priority: 0.9,
  },
  { path: "/contact/", label: "Contact", kind: "page", hasBooking: true, photoHero: true, changefreq: "monthly", priority: 0.8 },
  { path: "/privacy/", label: "Privacy Policy", kind: "legal", changefreq: "yearly", priority: 0.2 },
  { path: "/terms/", label: "Terms of Service", kind: "legal", changefreq: "yearly", priority: 0.2 },
  { path: "/text-messaging-terms/", label: "Text Messaging Terms", kind: "legal", changefreq: "yearly", priority: 0.2 },

  { path: "/about/", label: "About", kind: "page", changefreq: "monthly", priority: 0.7 },
  { path: "/blog/", label: "Blog", kind: "page", changefreq: "weekly", priority: 0.7 },
  {
    path: "/free-trauma-test/",
    label: "Free Trauma Test",
    kind: "page",
    hasBooking: true,
    changefreq: "monthly",
    priority: 0.7,
  },
  { path: "/tenacious-grace/", label: "Tenacious Grace", kind: "page", changefreq: "monthly", priority: 0.7 },
  { path: "/what-does-a-trauma-coach-do/", label: "What Does a Trauma Coach Do", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/what-causes-complex-trauma/", label: "What Causes Complex Trauma", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/the-gift-hidden-in-the-ask/", label: "The Gift Hidden in the Ask", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/is-grief-trauma/", label: "Is Grief Trauma", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/what-to-do-after-trauma/", label: "What to Do After Trauma", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/trauma-nightmares/", label: "Trauma Nightmares", kind: "post", changefreq: "yearly", priority: 0.6 },
  { path: "/how-to-trust-after-trauma/", label: "How to Trust After Trauma", kind: "post", changefreq: "yearly", priority: 0.6 },
];

export const publishedRoutes: readonly RouteEntry[] = routes.filter((r) => !r.pending);
export const pendingRoutes: readonly RouteEntry[] = routes.filter((r) => r.pending);

export function getRoute(path: string): RouteEntry | undefined {
  return routes.find((r) => r.path === path);
}

/** True when the path is in the registry and not pending. */
export function isPublished(path: string): boolean {
  const route = getRoute(path);
  return route !== undefined && !route.pending;
}

/** Every path that must be built to a page. Used by tests to compare against dist. */
export function publishedPaths(): string[] {
  return publishedRoutes.map((r) => r.path);
}
