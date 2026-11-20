import { legalFinal } from "../data/site";
import { publishedRoutes, type RouteEntry } from "./routeRegistry";
import { canonicalUrl } from "./seo";
import { EMAIL, SITE_NAME, SITE_URL } from "./site";

/** sitemap.xml, robots.txt and llms.txt are all generated from the route registry (pending routes are left out). */

/** Routes that belong in sitemap.xml and llms.txt. Legal pages drop out until legalFinal is true. */
export function indexedRoutes(
  routes: readonly RouteEntry[] = publishedRoutes,
  includeLegal: boolean = legalFinal,
): RouteEntry[] {
  return routes.filter((r) => !r.pending && (includeLegal || r.kind !== "legal"));
}

export function buildSitemap(
  routes: readonly RouteEntry[] = publishedRoutes,
  includeLegal: boolean = legalFinal,
): string {
  const urls = indexedRoutes(routes, includeLegal)
    .map(
      (r) =>
        `  <url>\n    <loc>${canonicalUrl(r.path)}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

export function buildLlms(
  descriptions: Record<string, string>,
  routes: readonly RouteEntry[] = publishedRoutes,
  includeLegal: boolean = legalFinal,
): string {
  const lines = indexedRoutes(routes, includeLegal)
    .map((r) => {
      const description = descriptions[r.path];
      return `- [${r.label}](${canonicalUrl(r.path)})${description ? `: ${description}` : ""}`;
    });
  return [
    `# ${SITE_NAME}`,
    "",
    "> JennaRhae is a faith-integrated Christian life coaching practice led by Jenna White, MA, Certified Biblical Counselor. Sessions are available online nationwide and in person in Kansas City, MO.",
    "",
    `Contact: ${EMAIL}`,
    "",
    "## Pages",
    "",
    ...lines,
    "",
  ].join("\n");
}
