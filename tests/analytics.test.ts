import { afterEach, describe, expect, it, vi } from "vitest";
import { GA_DELAY_MS, installGtagStub, loadGa, scheduleGa, trackEvent } from "../src/lib/analytics";
import { GA_MEASUREMENT_ID } from "../src/lib/site";

/** Minimal fakes: the loader only needs addEventListener, a script appender and querySelector. */
function makeDom(readyState: "loading" | "complete") {
  const listeners = new Map<string, Set<() => void>>();
  const scripts: { src: string; attrs: Record<string, string> }[] = [];
  const win = {
    dataLayer: undefined as unknown[] | undefined,
    gtag: undefined as undefined | ((...args: unknown[]) => void),
    addEventListener: (name: string, fn: () => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    removeEventListener: (name: string, fn: () => void) => listeners.get(name)?.delete(fn),
    fire: (name: string) => [...(listeners.get(name) ?? [])].forEach((fn) => fn()),
  };
  const doc = {
    readyState,
    head: { appendChild: (el: { src: string; attrs: Record<string, string> }) => scripts.push(el) },
    createElement: () => {
      const el = { src: "", async: false, attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };
      return el;
    },
    querySelector: () => (scripts.length > 0 ? {} : null),
  };
  return { win, doc, scripts };
}

afterEach(() => vi.useRealTimers());

describe("delayed GA4 loader", () => {
  it("does not load gtag.js on load alone: waits 3 seconds after window load", () => {
    vi.useFakeTimers();
    const { win, doc, scripts } = makeDom("loading");
    scheduleGa(doc as unknown as Document, win as unknown as Window);
    expect(scripts).toHaveLength(0);
    win.fire("load");
    vi.advanceTimersByTime(GA_DELAY_MS - 1);
    expect(scripts).toHaveLength(0);
    vi.advanceTimersByTime(2);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    expect(GA_MEASUREMENT_ID).toBe("G-VSL24X5BJM");
  });

  it("loads on the first interaction, before the timer, and only once", () => {
    vi.useFakeTimers();
    const { win, doc, scripts } = makeDom("loading");
    scheduleGa(doc as unknown as Document, win as unknown as Window);
    win.fire("pointerdown");
    expect(scripts).toHaveLength(1);
    win.fire("keydown");
    win.fire("load");
    vi.advanceTimersByTime(GA_DELAY_MS * 2);
    expect(scripts).toHaveLength(1);
  });

  it("starts the 3 second timer immediately when the page has already loaded", () => {
    vi.useFakeTimers();
    const { win, doc, scripts } = makeDom("complete");
    scheduleGa(doc as unknown as Document, win as unknown as Window);
    vi.advanceTimersByTime(GA_DELAY_MS + 1);
    expect(scripts).toHaveLength(1);
  });

  it("queues events fired before gtag.js arrives", () => {
    const { win } = makeDom("loading");
    installGtagStub(win as unknown as Window);
    trackEvent("generate_lead", { transaction_id: "abc" }, win as unknown as Window);
    expect(win.dataLayer).toHaveLength(1);
    expect(Array.from(win.dataLayer![0] as ArrayLike<unknown>)).toEqual(["event", "generate_lead", { transaction_id: "abc" }]);
  });

  it("loadGa configures only the one GA4 id", () => {
    const { win, doc } = makeDom("complete");
    loadGa(doc as unknown as Document, win as unknown as Window);
    const calls = (win.dataLayer as ArrayLike<unknown>[]).map((c) => Array.from(c));
    expect(calls[1]).toEqual(["config", "G-VSL24X5BJM"]);
  });
});
