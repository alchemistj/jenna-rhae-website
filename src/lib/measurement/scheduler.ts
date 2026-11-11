import { collectSchedulerOpened } from "./collect";

export const SCHEDULER_VISIBLE_RATIO = 0.5;

type VisibleEntry = {
  isIntersecting: boolean;
  intersectionRatio: number;
  intersectionRect: { height: number };
  rootBounds: { height: number } | null;
};

/**
 * Half the embed is in view, or a tall embed fills half the viewport.
 * A booking section taller than the screen never reaches a 0.5 intersection ratio.
 */
export function schedulerHalfVisible(entry: VisibleEntry): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= SCHEDULER_VISIBLE_RATIO) return true;
  const rootHeight = entry.rootBounds?.height ?? 0;
  return rootHeight > 0 && entry.intersectionRect.height >= rootHeight * SCHEDULER_VISIBLE_RATIO;
}

function isIframe(target: EventTarget | null): target is HTMLIFrameElement {
  if (!target || typeof target !== "object") return false;
  if (typeof HTMLIFrameElement !== "undefined" && target instanceof HTMLIFrameElement) return true;
  return (target as { tagName?: string }).tagName === "IFRAME";
}

/**
 * `load` does not replay. The booking iframe can finish before journey tracking
 * starts, and by then the resizer has written its height. Resource timing covers
 * a frame that loaded without an inline height yet.
 */
function frameAlreadyLoaded(frame: HTMLIFrameElement): boolean {
  if (frame.dataset?.jrLoaded === "1") return true;
  const inlineHeight = frame.style?.height ?? "";
  if (Number.parseFloat(inlineHeight) > 0) return true;
  if (typeof performance === "undefined" || !frame.src) return false;
  return performance.getEntriesByName(frame.src).some((entry) => {
    return entry.entryType === "resource" && (entry as PerformanceResourceTiming).responseEnd > 0;
  });
}

/**
 * Once per call, after the SpringboardCRM iframe inside #book has loaded and
 * the section is at least half visible. Returns a stop function.
 */
export function watchSchedulerOpened(onOpened: () => void = () => {
  void collectSchedulerOpened();
}): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") return () => undefined;
  const found = document.getElementById("book");
  if (!found) return () => undefined;
  const root = found;

  let fired = false;
  let watching = false;
  let observer: IntersectionObserver | null = null;

  const fire = () => {
    if (fired) return;
    fired = true;
    cleanup();
    onOpened();
  };

  const beginVisibilityWatch = () => {
    if (watching || fired) return;
    watching = true;
    if (typeof IntersectionObserver !== "function") return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (schedulerHalfVisible(entry)) fire();
        }
      },
      { threshold: [0, SCHEDULER_VISIBLE_RATIO, 1] },
    );
    observer.observe(root);
  };

  const onLoad = (event: Event) => {
    if (!isIframe(event.target) || !root.contains(event.target)) return;
    event.target.dataset.jrLoaded = "1";
    beginVisibilityWatch();
  };

  root.addEventListener("load", onLoad, true);
  const existing = root.querySelector("iframe");
  if (isIframe(existing) && frameAlreadyLoaded(existing)) {
    existing.dataset.jrLoaded = "1";
    beginVisibilityWatch();
  }

  function cleanup() {
    root.removeEventListener("load", onLoad, true);
    observer?.disconnect();
    observer = null;
  }

  return cleanup;
}
