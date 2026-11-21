/**
 * Build-time image inlining for the first frame (SOP astro-first-frame-and-pagespeed sections 3 and 4).
 * - Hero photo: one final AVIF at the source width, capped at 1920px, at most 80 KB, inlined once as a data URI.
 * - Logo: a small WebP (at most 4 KB) sized to its display box at 2x, inlined in the header.
 * Both read the original from src/assets and are cached for the build.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export interface InlineImage {
  dataUri: string;
  width: number;
  height: number;
  bytes: number;
}

const HERO_MAX_WIDTH = 1920;
/** Smallest cap that still keeps every hero at AVIF quality 50 or above, and under 110 KB. */
const HERO_MAX_BYTES = 80_000;
const LOGO_MAX_BYTES = 4_000;

const cache = new Map<string, Promise<InlineImage>>();

function assetPath(file: string): string {
  return path.join(process.cwd(), "src", "assets", file);
}

async function buildHero(file: string): Promise<InlineImage> {
  const source = await readFile(assetPath(file));
  const input = sharp(source);
  const sourceMeta = await input.metadata();
  const targetWidth = Math.min(sourceMeta.width ?? HERO_MAX_WIDTH, HERO_MAX_WIDTH);
  const resized = input.resize({ width: targetWidth, withoutEnlargement: true });
  const meta = await resized.clone().toBuffer({ resolveWithObject: true });
  const height = meta.info.height;
  const width = meta.info.width;

  // Find the highest quality at 50 or above that fits the budget, then do the slow final encode.
  let chosen = 50;
  for (const quality of [80, 74, 68, 62, 56, 50]) {
    const probe = await resized.clone().avif({ quality, effort: 3 }).toBuffer();
    if (probe.length <= HERO_MAX_BYTES) {
      chosen = quality;
      break;
    }
  }
  const final = await resized.clone().avif({ quality: chosen, effort: 6 }).toBuffer();
  return {
    dataUri: `data:image/avif;base64,${final.toString("base64")}`,
    width,
    height,
    bytes: final.length,
  };
}

async function buildLogo(file: string, displayWidth: number): Promise<InlineImage> {
  const source = await readFile(assetPath(file));
  const resized = sharp(source).resize({ width: displayWidth * 2, withoutEnlargement: true });
  let out: Buffer = Buffer.alloc(0);
  let info = { width: 0, height: 0 };
  for (const quality of [70, 60, 50, 40]) {
    const res = await resized.clone().webp({ quality, effort: 6 }).toBuffer({ resolveWithObject: true });
    out = res.data;
    info = res.info;
    if (out.length <= LOGO_MAX_BYTES) break;
  }
  return {
    dataUri: `data:image/webp;base64,${out.toString("base64")}`,
    width: info.width,
    height: info.height,
    bytes: out.length,
  };
}

export function getHeroPhoto(file: string): Promise<InlineImage> {
  const key = `hero:${file}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = buildHero(file);
    cache.set(key, hit);
  }
  return hit;
}

export function getInlineLogo(file: string, displayWidth: number): Promise<InlineImage> {
  const key = `logo:${file}:${displayWidth}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = buildLogo(file, displayWidth);
    cache.set(key, hit);
  }
  return hit;
}
