// Save the rendered HTML of each page's source (Lovable mockup or live WordPress) to
// source/pages/<slug>/rendered.html, for scripts/qa/paragraphs.mjs to compare against.
// Run once before launch, while the WordPress site is still live. Usage: node scripts/qa/capture-sources.mjs
import { createRequire } from "node:module";
// Playwright is not a project dependency: run with NODE_PATH set to a global install (e.g. NODE_PATH=$(npm root -g)).
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const { pages } = JSON.parse(readFileSync("scripts/qa/pages.json", "utf8"));
const only = (process.env.PAGES || "").split(",").filter(Boolean);
const browser = await chromium.launch();
for (const pg of pages) {
  if (only.length && !only.includes(pg.slug)) continue;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(pg.source, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4000);
  const html = await page.content();
  const dir = path.join("source/pages", pg.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "rendered.html"), html);
  console.log(pg.slug, html.length);
  await page.close();
}
await browser.close();
