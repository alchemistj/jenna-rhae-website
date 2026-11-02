import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishedRoutes } from "../src/lib/routeRegistry";

export const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
export const DIST = path.join(ROOT, "dist");

export function pageFile(routePath: string): string {
  return path.join(DIST, routePath, "index.html");
}

export function readPage(routePath: string): string {
  return readFileSync(pageFile(routePath), "utf8");
}

export function allPageHtml(): { path: string; html: string }[] {
  return publishedRoutes.map((r) => ({ path: r.path, html: readPage(r.path) }));
}

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

export function normalize(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

/** Visible-ish text: scripts, styles and tags removed (no space inserted, so <span>J</span>ENNARHAE reads JENNARHAE). */
export function textOf(html: string): string {
  return normalize(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
}

/** Every string value in a data object, with the key it sits under. */
export function collectStrings(value: unknown, key = ""): { key: string; value: string }[] {
  if (typeof value === "string") return [{ key, value }];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, key));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => collectStrings(v, k));
  }
  return [];
}

/** Keys that hold data, not visible words: routing, image keys, discriminators. */
export const NON_COPY_KEYS = new Set([
  "path",
  "href",
  "image",
  "ogImage",
  "type",
  "bg",
  "icon",
  "objectPosition",
  "side",
  "columns",
]);
