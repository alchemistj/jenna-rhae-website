/**
 * Deferred third-party iframes. Server HTML has no <iframe>. One is created on the
 * first interaction, or when 10% of the box is visible, whichever comes first.
 *
 * Booking boxes (data-autosize) also load SpringboardCRM's resizer at that moment,
 * once, so the calendar grows to its content. The script is not loaded on page load.
 * It scans every light-DOM iframe whose src contains /booking or /quiz, so a quiz
 * embed on the same page is placed in a closed shadow root and left alone.
 */
import { FORM_EMBED_URL } from "./site";

export const DEFERRED_IFRAME_EVENTS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;

const RESIZER_MARK = "data-form-embed";

const scans = new WeakMap<Document, Promise<void>>();

type EmbedWindow = Window & { IntersectionObserver?: typeof IntersectionObserver };

export function loadFormEmbed(doc: Document = document): Promise<void> {
  const cached = scans.get(doc);
  if (cached) return cached;
  const pending = new Promise<void>((resolve) => {
    const script = doc.createElement("script");
    const finish = () => {
      script.dataset.scanned = "true";
      resolve();
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", finish, { once: true });
    script.src = FORM_EMBED_URL;
    script.async = true;
    script.setAttribute(RESIZER_MARK, "");
    doc.head.appendChild(script);
  });
  scans.set(doc, pending);
  return pending;
}

/** Quiz (and any other non-autosize embed) stays out of the resizer's document scan. */
function mountPoint(box: HTMLElement, doc: Document): ParentNode {
  if (box.dataset.autosize === "true") return box;
  if (!doc.querySelector("[data-deferred-iframe][data-autosize='true']")) return box;
  const host = doc.createElement("div");
  host.setAttribute("data-embed-slot", "");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = doc.createElement("style");
  style.textContent = "iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;}";
  shadow.append(style);
  box.appendChild(host);
  return shadow;
}

/** Create the iframe for one box. Returns null if it was already created or has no src. */
export function mountDeferredIframe(box: HTMLElement, doc: Document = document): HTMLIFrameElement | null {
  if (box.dataset.loaded === "true" || box.dataset.pending === "true" || !box.dataset.src) return null;
  box.dataset.loaded = "true";
  const frame = doc.createElement("iframe");
  frame.src = box.dataset.src;
  frame.title = box.dataset.title ?? "";
  frame.setAttribute("allow", "payments");
  if (box.dataset.autosize === "true") {
    if (box.dataset.frameId) frame.id = box.dataset.frameId;
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("style", "width:100%;border:none;overflow:hidden;");
  }
  mountPoint(box, doc).appendChild(frame);
  return frame;
}

/**
 * Mount one box. An autosize box also starts the resizer. A plain box that is
 * still waiting on the resizer's first scan is mounted after that scan, so the
 * scanner does not see it appear mid-init. Shadow isolation covers later scans.
 */
export function activateDeferredBox(box: HTMLElement, doc: Document = document): void {
  if (box.dataset.loaded === "true" || box.dataset.pending === "true" || !box.dataset.src) return;
  const resizer = doc.querySelector<HTMLScriptElement>(`script[${RESIZER_MARK}]`);
  const waitForScan = box.dataset.autosize !== "true" && resizer != null && resizer.dataset.scanned !== "true";
  if (waitForScan) {
    box.dataset.pending = "true";
    void loadFormEmbed(doc).then(() => {
      delete box.dataset.pending;
      mountDeferredIframe(box, doc);
    });
    return;
  }
  const frame = mountDeferredIframe(box, doc);
  if (frame && box.dataset.autosize === "true") void loadFormEmbed(doc);
}

/** Wire every deferred box on the page. Returns a cancel function (used by tests). */
export function startDeferredIframes(doc: Document = document, win: EmbedWindow = window): () => void {
  const boxes = Array.from(doc.querySelectorAll<HTMLElement>("[data-deferred-iframe]"));
  if (boxes.length === 0) return () => undefined;

  let stopped = false;
  const ordered = [
    ...boxes.filter((box) => box.dataset.autosize === "true"),
    ...boxes.filter((box) => box.dataset.autosize !== "true"),
  ];

  const loadAll = () => {
    if (stopped) return;
    stopped = true;
    for (const name of DEFERRED_IFRAME_EVENTS) win.removeEventListener(name, loadAll);
    observer?.disconnect();
    for (const box of ordered) activateDeferredBox(box, doc);
  };

  for (const name of DEFERRED_IFRAME_EVENTS) {
    win.addEventListener(name, loadAll, { passive: true, once: true });
  }

  const Observer = win.IntersectionObserver;
  let observer: IntersectionObserver | null = null;
  if (typeof Observer === "function") {
    const created = new Observer(
      (entries) => {
        if (stopped) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          activateDeferredBox(entry.target as HTMLElement, doc);
          created.unobserve(entry.target);
        }
      },
      { rootMargin: "0px", threshold: 0.1 },
    );
    observer = created;
    for (const box of boxes) created.observe(box);
  }

  return () => {
    stopped = true;
    for (const name of DEFERRED_IFRAME_EVENTS) win.removeEventListener(name, loadAll);
    observer?.disconnect();
  };
}
