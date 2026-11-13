// Paragraph checks for a rebuild (Rule 4 typography, Rule 0.4 keeps the human work).
//
// 1. Length: every body paragraph renders at most 4 lines at 1440 (Rule 4: paragraphs 3-4 lines max).
//    A paragraph that is a single sentence is reported but does not fail: it cannot split without changing words.
//    390 is reported too, for information: 4 lines there is about 30 words, so it does not fail the check.
// 2. Parity: every paragraph on the live site (from the saved capture in source/pages/<slug>/rendered.html)
//    is its own paragraph in the build. A live <p> split by a blank line (<br><br>) counts as separate
//    paragraphs. A live paragraph may be split into consecutive build paragraphs (allowed when it would
//    break the 4-line max), but only between sentences: each part but the last must end a sentence.
//    It must never be merged into a longer paragraph, and never dropped.
//
// Ported from alchemistj/springfield-warrior-sports-website (scripts/qa/paragraphs.mjs, PR #9).
// JennaRhae: the pages and where their words came from are in scripts/qa/pages.json (Lovable mockup for the
// new pages, live WordPress for the rebuilt ones). Run scripts/qa/capture-sources.mjs first to save the sources.
// Approved copy changes since then (name, email, removed coaches) are applied to the source text from
// scripts/qa/paragraph-edits.json before comparing.
//
// Usage: NODE_PATH=$(npm root -g) node scripts/qa/paragraphs.mjs <build-base-url> [out.md]
//   PAGES=home,about limits the pages. Exit code 1 when any check fails.
import { createRequire } from "node:module";
// Playwright is not a project dependency: run with NODE_PATH set to a global install.
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const [base, outFile = "paragraph-report.md"] = process.argv.slice(2);
if (!base) { console.error("usage: node scripts/qa/paragraphs.mjs <build-base-url> [out.md]"); process.exit(2); }
const only = (process.env.PAGES || "").split(",").filter(Boolean);
const PAGES = JSON.parse(readFileSync("scripts/qa/pages.json", "utf8")).pages;
const pathFor = Object.fromEntries(PAGES.map((p) => [p.slug, p.path]));
const slugs = PAGES.map((p) => p.slug).filter((s) => existsSync(path.join("source/pages", s, "rendered.html")) && (!only.length || only.includes(s)));
const EDITS = JSON.parse(readFileSync("scripts/qa/paragraph-edits.json", "utf8"));
const applyEdits = (t) => EDITS.replace.reduce((acc, e) => (e.regex ? acc.replace(new RegExp(e.from), e.to) : acc.split(e.from).join(e.to)), t);
const MAX_LINES = 4;
const MIN_CHARS = 25; // shorter fragments are labels, not paragraphs

// Runs in the page: the paragraphs of the main content, split on blank lines (<br><br>).
function collect({ maxLines, withReviews }) {
  const CHROME = "header, footer, nav, form, .mobile-bar, [data-region=header], [data-region=footer], #tve_header_wrapper, #tve_footer_wrapper, .thrv_header, .thrv_footer, .site-header, .site-footer, .trust-bar, [data-skip-paragraphs]";
  // Reviews are customers' words: they count for parity (not dropped or merged) but not for the length rule.
  const SKIP = withReviews ? CHROME : CHROME + ", .review-band, .b2-quotes, .quote, blockquote, [class*=review], [class*=testimonial]";
  const norm = (t) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const out = [];
  for (const p of document.querySelectorAll("p")) {
    if (p.closest(SKIP)) continue;
    const cs = getComputedStyle(p);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    // Split on two or more <br> in a row (a blank line in the copy).
    const parts = [];
    let cur = "";
    let brRun = 0;
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { if (n.textContent.trim()) brRun = 0; cur += n.textContent; }
        else if (n.nodeName === "BR") { brRun++; if (brRun >= 2) { parts.push(cur); cur = ""; } else cur += " "; }
        else { brRun = 0; walk(n); }
      }
    };
    walk(p);
    parts.push(cur);
    // Line count of the whole <p> as rendered (rects grouped by vertical position).
    let lines = 0;
    if (maxLines) {
      const range = document.createRange();
      range.selectNodeContents(p);
      const tops = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2).map((r) => Math.round(r.top + r.height / 2));
      const uniq = [];
      for (const t of tops.sort((a, b) => a - b)) if (!uniq.length || t - uniq[uniq.length - 1] > 4) uniq.push(t);
      lines = uniq.length;
    }
    for (const part of parts) {
      const t = norm(part);
      if (t.length >= 25) out.push({ text: t, lines: parts.length > 1 ? null : lines });
    }
  }
  return out;
}

const browser = await chromium.launch();
const rows = [];
const pending = []; // [slug, live paragraph] not found on its own page; checked site-wide at the end
const allBuild = new Set();
let fails = 0;
for (const slug of slugs) {
  // Live paragraphs from the saved capture (no network: scripts and styles are not needed for text).
  const live = await browser.newPage();
  await live.route("**/*", (r) => r.abort());
  await live.setContent(readFileSync(path.join("source/pages", slug, "rendered.html"), "utf8"), { waitUntil: "domcontentloaded" }).catch(() => {});
  const IGNORE = EDITS.ignore.map((i) => new RegExp(i.pattern, "i"));
  const liveParas = (await live.evaluate(collect, { maxLines: 0, withReviews: true }))
    .filter((l) => !IGNORE.some((re) => re.test(l.text)))
    .map((l) => ({ ...l, text: applyEdits(l.text) }));
  await live.close();

  const url = `${base.replace(/\/$/, "")}${pathFor[slug]}`;
  const byWidth = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto(url, { waitUntil: "load" });
    await p.waitForTimeout(2000);
    byWidth[w] = await p.evaluate(collect, { maxLines: MAX_LINES, withReviews: false });
    if (w === 1440) byWidth.parity = await p.evaluate(collect, { maxLines: 0, withReviews: true });
    await p.close();
  }
  const build = byWidth.parity;
  const buildTexts = build.map((b) => b.text);
  buildTexts.forEach((t) => allBuild.add(t));
  const issues = [];
  const notes = [];

  // Parity
  for (const lp of liveParas) {
    if (buildTexts.includes(lp.text)) continue;
    let split = null;
    for (let i = 0; i < buildTexts.length && !split; i++) {
      let acc = buildTexts[i];
      for (let j = i + 1; j < buildTexts.length && acc.length < lp.text.length; j++) {
        acc += " " + buildTexts[j];
        if (acc === lp.text) { split = buildTexts.slice(i, j + 1); break; }
      }
    }
    if (split) {
      // A split must fall between sentences: every part but the last ends with . ! or ? (closing quotes allowed),
      // and the next part starts a new sentence, not a lowercase word.
      // A next part that starts in lowercase continues the sentence (e.g. a split after "Mo.").
      split.slice(0, -1).forEach((part, k) => {
        const next = split[k + 1];
        if (!/[.!?]["'”’)]*$/.test(part) || /^[a-z]/.test(next)) issues.push(`split mid-sentence: "…${part.slice(-50)}" / "${next.slice(0, 40)}…"`);
      });
      continue;
    }
    const host = buildTexts.find((b) => b.includes(lp.text));
    if (host) issues.push(`merged: "${lp.text.slice(0, 70)}…" is inside a longer build paragraph ("${host.slice(0, 50)}…")`);
    else pending.push([slug, lp.text, issues]);
  }
  // Length
  for (const w of [1440, 390]) {
    for (const b of byWidth[w]) {
      if (!(b.lines && b.lines > MAX_LINES)) continue;
      // One sentence on its own cannot be split without changing words: report it, do not fail.
      // A period before a lowercase word is not a new sentence (the same rule as a split after "Mo.").
      const oneSentence = !/[.!?]["'”’)]*\s+[A-Z0-9“"'(]/.test(b.text);
      if (w === 1440 && oneSentence) notes.push(`${w}px (one sentence, cannot split): ${b.lines} lines: "${b.text.slice(0, 60)}…"`);
      else if (w === 1440) issues.push(`${w}px: ${b.lines} lines (max ${MAX_LINES}): "${b.text.slice(0, 70)}…"`);
      else notes.push(`${w}px (info only): ${b.lines} lines: "${b.text.slice(0, 60)}…"`);
    }
  }
  fails += issues.length;
  rows.push(`## ${slug}: ${issues.length ? issues.length + " issue(s)" : "passes"}\n${issues.map((i) => `- ${i}`).join("\n")}${notes.length ? "\n" + notes.map((n) => `- ${n}`).join("\n") : ""}`);
}
await browser.close();
// A paragraph moved to another page (reviews spread across pages) still counts; one found nowhere is missing.
for (const [slug, text, issues] of pending) {
  if (allBuild.has(text)) continue;
  issues.push(`missing as its own paragraph: "${text.slice(0, 80)}…"`);
  fails++;
  const i = rows.findIndex((r) => r.startsWith(`## ${slug}:`));
  rows[i] = `## ${slug}: ${issues.length} issue(s)\n${issues.map((x) => `- ${x}`).join("\n")}`;
}
writeFileSync(outFile, `# Paragraph checks on ${base}\n\nTotal issues: ${fails}\n\n${rows.join("\n\n")}\n`);
console.log(`Total issues: ${fails}`);
for (const r of rows) console.log(r.split("\n")[0]);
process.exit(fails ? 1 : 0);
