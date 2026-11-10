/**
 * WordPress inline markdown, one form (see docs/wp-content-notes.md):
 * [label](href), **bold**, *italic*, and a newline becomes <br />.
 * #trauma-quiz links go to the quiz on /free-trauma-test/.
 */

import { isContactHref } from "./measurement/contactHref";

const TRAUMA_QUIZ_HREF = "/free-trauma-test/#trauma-quiz";

export function rewriteHref(href: string): string {
  if (href.includes("#trauma-quiz")) return TRAUMA_QUIZ_HREF;
  return href;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emphasis(value: string): string {
  return value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** Render one WordPress text string to HTML. The input is escaped; only the markdown above becomes tags. */
export function renderInline(input: string): string {
  const parts: string[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    parts.push(emphasis(escapeHtml(input.slice(last, match.index))).replace(/\n/g, "<br />"));
    const label = emphasis(escapeHtml(match[1] ?? "")).replace(/\n/g, "<br />");
    const href = rewriteHref(match[2] ?? "");
    const external = /^https?:\/\//.test(href);
    const extra = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    const cta = isContactHref(href) ? ' data-cta-location="main"' : "";
    parts.push(`<a class="link-accent" href="${escapeHtml(href)}"${cta}${extra}>${label}</a>`);
    last = match.index + match[0].length;
  }
  parts.push(emphasis(escapeHtml(input.slice(last))).replace(/\n/g, "<br />"));
  return parts.join("");
}

/** Visible words of a WordPress string, for tests: markdown markers removed, links reduced to their labels. */
export function markdownToText(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, (_match, label: string) => label.replace(/\*\*/g, "").replace(/\*/g, ""))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\n/g, " ");
}
