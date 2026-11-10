/** True for a link whose path is /contact, including /contact/#book. Hash-only and other hosts are not. */
export function isContactHref(href: string | null | undefined): boolean {
  const trimmed = href?.trim() ?? "";
  if (!trimmed || trimmed.startsWith("#")) return false;
  if (/^(mailto|tel):/i.test(trimmed)) return false;
  try {
    const absolute = trimmed.startsWith("/") ? new URL(trimmed, "https://jennarhae.com") : new URL(trimmed);
    if (!trimmed.startsWith("/")) {
      const host = absolute.hostname.toLowerCase();
      if (host !== "jennarhae.com" && host !== "www.jennarhae.com") return false;
    }
    const path = absolute.pathname.replace(/\/+$/, "") || "/";
    return path === "/contact";
  } catch {
    return false;
  }
}
