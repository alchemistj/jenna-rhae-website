/** Calendar date from a WordPress ISO string, in the same words as the blog listing ("November 12, 2025"). */
export function formatWpDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Bad WordPress date ${iso}`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
