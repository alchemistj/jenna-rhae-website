/**
 * Redirect map (one data file). vercel.json must match it: tests/redirects.test.ts checks both ways.
 * Each source is listed in both slash forms. Anything else stays a 404.
 */
export interface Redirect {
  source: string;
  destination: string;
}

const SOURCES: ReadonlyArray<readonly [string, string]> = [
  ["/trauma-coaching", "/trauma-recovery-coaching/"],
  ["/life-coach-columbia-mo", "/christian-life-coach-kansas-city-mo/"],
  ["/feed", "/blog/"],
  ["/comments/feed", "/blog/"],
];

export const redirects: readonly Redirect[] = SOURCES.flatMap(([source, destination]) => [
  { source, destination },
  { source: `${source}/`, destination },
]);

/** www to apex, one hop, keeps the path and query. */
export const wwwRedirect = {
  source: "/(.*)",
  has: [{ type: "host", value: "www.jennarhae.com" }],
  destination: "https://jennarhae.com/$1",
  permanent: true,
} as const;
