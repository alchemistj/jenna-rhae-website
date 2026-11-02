/**
 * Delayed GA4 loader (Rule 16): loads gtag.js on window load + 3 seconds or on the first interaction,
 * whichever comes first. A stub `gtag` queues calls on `dataLayer` until the library arrives, so events
 * fired before then (for example generate_lead) are not lost.
 */
import { GA_MEASUREMENT_ID } from "./site";

export const GA_DELAY_MS = 3000;
export const GA_INTERACTION_EVENTS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export function installGtagStub(win: GtagWindow = window): void {
  win.dataLayer = win.dataLayer || [];
  if (!win.gtag) {
    win.gtag = function gtag() {
      // gtag.js reads the `arguments` object itself, so push it as-is, not a copy.
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
  }
}

export function loadGa(doc: Document = document, win: GtagWindow = window, id: string = GA_MEASUREMENT_ID): boolean {
  if (doc.querySelector("script[data-ga]")) return false;
  installGtagStub(win);
  win.gtag!("js", new Date());
  win.gtag!("config", id);
  const script = doc.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.setAttribute("data-ga", "");
  doc.head.appendChild(script);
  return true;
}

/** Wire the delayed load. Returns a cancel function (used by tests). */
export function scheduleGa(doc: Document = document, win: GtagWindow = window): () => void {
  installGtagStub(win);
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    for (const name of GA_INTERACTION_EVENTS) win.removeEventListener(name, start);
    win.removeEventListener("load", onLoad);
    if (timer !== undefined) clearTimeout(timer);
  };
  function start() {
    if (done) return;
    done = true;
    cleanup();
    loadGa(doc, win);
  }
  function onLoad() {
    timer = setTimeout(start, GA_DELAY_MS);
  }

  for (const name of GA_INTERACTION_EVENTS) win.addEventListener(name, start, { passive: true, once: true });
  if (doc.readyState === "complete") onLoad();
  else win.addEventListener("load", onLoad, { once: true });
  return cleanup;
}

/** Fire a GA4 event. Safe before the library has loaded because of the stub. */
export function trackEvent(name: string, params: Record<string, unknown>, win: GtagWindow = window): void {
  installGtagStub(win);
  win.gtag!("event", name, params);
}
