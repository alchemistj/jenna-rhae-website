import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStoredAttributionForTests } from "../src/lib/attribution/storage";
import { resetJourneyTrackingForTests, startJourneyTracking } from "../src/lib/measurement/bootstrap";
import {
  beginPageEngagement,
  buildMeasurementEvent,
  collectContactClick,
  collectMeasurementEvent,
  collectPageView,
  collectSchedulerOpened,
  pageViewEventIdFor,
  signalPageEngaged,
} from "../src/lib/measurement/collect";
import { MEASUREMENT_EVENT_NAMES, SESSION_CHANNEL_KEY } from "../src/lib/measurement/contract";
import { bindJourneyContactClicks } from "../src/lib/measurement/interactions";
import { schedulerHalfVisible, watchSchedulerOpened } from "../src/lib/measurement/scheduler";
import { VISIBLE_MS, watchEngagedSignal } from "../src/lib/measurement/engaged";

const VISITOR = "ffvid-11111111-1111-4111-8111-111111111111";
const SESSION = "ffsid-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COOKIE = `ff_vid=${VISITOR}; ff_sid=${SESSION}; ff_entry=test-offer`;

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

const session = memoryStorage();
const local = memoryStorage();
const sent: string[] = [];

function storageDump(): string {
  const bits: string[] = [];
  for (let index = 0; index < session.length; index += 1) {
    const key = session.key(index);
    if (key) bits.push(`${key}=${session.getItem(key)}`);
  }
  return bits.join("\n");
}

function installBrowser(pathname = "/trauma-coaching/") {
  sent.length = 0;
  session.clear();
  local.clear();
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  const listen = (type: string, fn: (event?: unknown) => void) => {
    const set = listeners.get(type) ?? new Set();
    set.add(fn);
    listeners.set(type, set);
  };
  const unlisten = (type: string, fn: (event?: unknown) => void) => {
    listeners.get(type)?.delete(fn);
  };
  const windowListeners = new Map<string, Set<(event?: unknown) => void>>();
  const win = {
    location: { pathname, hostname: "jennarhae.com", search: "", href: `https://jennarhae.com${pathname}` },
    innerWidth: 1280,
    sessionStorage: session,
    localStorage: local,
    navigator: {
      webdriver: false,
      userAgent: "Mozilla/5.0",
      languages: ["en-US"],
    },
    addEventListener(type: string, fn: (event?: unknown) => void) {
      const set = windowListeners.get(type) ?? new Set();
      set.add(fn);
      windowListeners.set(type, set);
    },
    removeEventListener(type: string, fn: (event?: unknown) => void) {
      windowListeners.get(type)?.delete(fn);
    },
    dispatch(type: string) {
      for (const fn of [...(windowListeners.get(type) ?? [])]) fn({ type, persisted: false });
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };
  const documentListeners = new Map<string, Set<(event?: unknown) => void>>();
  const doc = {
    cookie: COOKIE,
    referrer: "",
    readyState: "complete",
    visibilityState: "visible",
    addEventListener(type: string, fn: (event?: unknown) => void) {
      const set = documentListeners.get(type) ?? new Set();
      set.add(fn);
      documentListeners.set(type, set);
    },
    removeEventListener(type: string, fn: (event?: unknown) => void) {
      documentListeners.get(type)?.delete(fn);
    },
    dispatch(type: string, event: unknown = { type }) {
      for (const fn of [...(documentListeners.get(type) ?? [])]) fn(event);
    },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal(
    "fetch",
    (async (_url: string, requestInit?: RequestInit) => {
      sent.push(String(requestInit?.body));
      return new Response("{}", { status: 202 });
    }) as typeof fetch,
  );
  return { win, doc, listen, unlisten };
}

const init = {
  cookieHeader: COOKIE,
  currentHost: "jennarhae.com",
  now: () => "2026-11-09T12:00:00.000Z",
  fetchImpl: (async (_url: string, requestInit?: RequestInit) => {
    sent.push(String(requestInit?.body));
    return new Response("{}", { status: 202 });
  }) as typeof fetch,
};

afterEach(() => {
  resetJourneyTrackingForTests();
  clearStoredAttributionForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sent.length = 0;
});

describe("journey events", () => {
  it("sends each event once with ff_vid, ff_sid, and the path, and no personal data", async () => {
    installBrowser("/trauma-coaching/");
    expect(MEASUREMENT_EVENT_NAMES).not.toContain("click_to_call");
    const token = beginPageEngagement("/trauma-coaching/");
    const page = await collectPageView(init);
    expect(page).toMatchObject({ ok: true, sent: true });
    const again = await collectPageView(init);
    expect(again).toMatchObject({ duplicate: true, sent: false });
    const eventId = pageViewEventIdFor(token);
    expect(eventId).toEqual(expect.any(String));
    if (!eventId) throw new Error("page view event id missing");
    expect(signalPageEngaged(token)).toBe("follow-up");
    expect(signalPageEngaged(token)).toBe("already");
    const follow = await collectMeasurementEvent(
      buildMeasurementEvent("page_view", { currentPath: "/trauma-coaching/", engaged: true, eventId }, init),
      init,
    );
    expect(follow).toMatchObject({ ok: true, sent: true });
    const duplicateFollow = await collectMeasurementEvent(
      buildMeasurementEvent("page_view", { currentPath: "/trauma-coaching/", engaged: true, eventId }, init),
      init,
    );
    expect(duplicateFollow).toMatchObject({ duplicate: true });

    const contact = await collectContactClick({ ctaLocation: "hero" }, init);
    expect(contact).toMatchObject({ ok: true, sent: true });
    const scheduler = await collectSchedulerOpened(init);
    expect(scheduler).toMatchObject({ ok: true, sent: true });

    const bodies = sent.filter((body) => body.startsWith("{")).map((body) => JSON.parse(body) as Record<string, unknown>);
    const names = bodies.map((body) => body.event);
    expect(names.filter((name) => name === "page_view")).toHaveLength(2);
    expect(bodies[0]).toMatchObject({
      event: "page_view",
      visitorId: VISITOR,
      sessionId: SESSION,
      currentPath: "/trauma-coaching/",
      entry: "test-offer",
    });
    expect(bodies[0]).not.toHaveProperty("engaged");
    expect(bodies[1]).toMatchObject({ event: "page_view", eventId, engaged: true, visitorId: VISITOR, sessionId: SESSION });
    expect(bodies.find((body) => body.event === "contact_click")).toMatchObject({
      ctaLocation: "hero",
      visitorId: VISITOR,
      sessionId: SESSION,
      currentPath: "/trauma-coaching/",
    });
    expect(bodies.find((body) => body.event === "scheduler_opened")).toMatchObject({
      visitorId: VISITOR,
      sessionId: SESSION,
      currentPath: "/trauma-coaching/",
    });
    expect(JSON.stringify(bodies)).not.toMatch(/@|Jane|please ignore|555-/);
    expect(storageDump()).not.toContain(SESSION);
    expect(storageDump()).not.toContain(VISITOR);
  });

  it("keeps the first channel and never writes the session id", async () => {
    installBrowser();
    const first = buildMeasurementEvent(
      "page_view",
      { currentPath: "/", referrer: "https://www.google.com/search?q=secret@example.com" },
      init,
    );
    expect(first.channel).toBe("organic");
    expect(first.referrer).toBe("https://www.google.com/search");
    expect(session.getItem(SESSION_CHANNEL_KEY)).toBe("organic");
    const second = buildMeasurementEvent(
      "page_view",
      { currentPath: "/contact/", referrer: "https://news.example.com/story" },
      init,
    );
    expect(second.channel).toBe("organic");
    expect(session.getItem(SESSION_CHANNEL_KEY)).toBe("organic");
    expect(storageDump()).not.toContain(SESSION);

    session.clear();
    expect(
      buildMeasurementEvent("page_view", { referrer: "https://jennarhae.com/contact/" }, { ...init, cookieHeader: COOKIE }).channel,
    ).toBe("direct");
    session.clear();
    expect(
      buildMeasurementEvent(
        "page_view",
        { referrer: "https://www.jennarhae.com/" },
        { ...init, cookieHeader: COOKIE },
      ).channel,
    ).toBe("direct");
    session.clear();
    expect(
      buildMeasurementEvent(
        "page_view",
        { referrer: "https://jenna-rhae-website-git-preview.vercel.app/contact/" },
        { ...init, cookieHeader: COOKIE },
      ).channel,
    ).toBe("direct");
    session.clear();
    expect(
      buildMeasurementEvent("page_view", { gclid: "click-1", referrer: null }, { ...init, cookieHeader: COOKIE }).channel,
    ).toBe("paid");
  });

  it("does not send when the bot marker is set", async () => {
    const result = await collectPageView({ ...init, cookieHeader: `${COOKIE}; ff_bot=1` });
    expect(result).toEqual({ ok: true, sent: false, skipped: "bot" });
    expect(sent).toEqual([]);
  });

  it("fires contact_click once from a Book button or a /contact/ link, with its ctaLocation", async () => {
    const { doc } = installBrowser("/contact/");
    const stop = bindJourneyContactClicks();
    const link = {
      hasAttribute(name: string) {
        return name === "data-book";
      },
      getAttribute(name: string) {
        if (name === "href") return "#book";
        if (name === "data-cta-location") return "footer";
        return null;
      },
      closest(sel: string) {
        return sel === "a" ? link : null;
      },
    };
    const child = { parentElement: link, closest: (sel: string) => link.closest(sel) };
    doc.dispatch("click", { target: child });
    doc.dispatch("click", { target: { closest: () => null, parentElement: null } });
    stop();
    await vi.waitFor(() => expect(sent.length).toBeGreaterThan(0));
    const bodies = sent.filter((body) => body.startsWith("{"));
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0]!)).toMatchObject({
      event: "contact_click",
      ctaLocation: "footer",
      visitorId: VISITOR,
      sessionId: SESSION,
      currentPath: "/contact/",
    });
  });

  it("marks engaged once on scroll, tap, key press, or 10 visible seconds", () => {
    installBrowser();
    const calls: string[] = [];
    const stop = watchEngagedSignal(() => calls.push("engaged"));
    (globalThis as unknown as { window: { dispatch: (type: string) => void } }).window.dispatch("scroll");
    (globalThis as unknown as { window: { dispatch: (type: string) => void } }).window.dispatch("keydown");
    expect(calls).toEqual(["engaged"]);
    stop();

    const later: string[] = [];
    vi.useFakeTimers();
    const win = globalThis.window as unknown as {
      setTimeout: typeof setTimeout;
      clearTimeout: typeof clearTimeout;
    };
    win.setTimeout = globalThis.setTimeout.bind(globalThis);
    win.clearTimeout = globalThis.clearTimeout.bind(globalThis);
    const stopTimer = watchEngagedSignal(() => later.push("engaged"));
    vi.advanceTimersByTime(VISIBLE_MS);
    expect(later).toEqual(["engaged"]);
    stopTimer();
  });

  it("sends scheduler_opened once after the booking iframe loads and is half visible", () => {
    installBrowser();
    const previous = globalThis.IntersectionObserver;
    let observed = false;
    class FakeObserver {
      constructor(private readonly callback: (entries: unknown[]) => void) {}
      observe() {
        observed = true;
        this.callback([
          {
            isIntersecting: true,
            intersectionRatio: 0.2,
            intersectionRect: { height: 500 },
            rootBounds: { height: 800 },
          },
        ]);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const loadListeners: Array<(event: { target: unknown }) => void> = [];
    const iframe = { tagName: "IFRAME", dataset: {} as Record<string, string> };
    const root = {
      addEventListener(type: string, fn: (event: { target: unknown }) => void) {
        if (type === "load") loadListeners.push(fn);
      },
      removeEventListener() {},
      querySelector() {
        return iframe;
      },
      contains(node: unknown) {
        return node === iframe;
      },
    };
    vi.stubGlobal("document", {
      ...(globalThis.document as object),
      getElementById(id: string) {
        return id === "book" ? root : null;
      },
    });
    const calls: string[] = [];
    expect(schedulerHalfVisible({ isIntersecting: false, intersectionRatio: 1, intersectionRect: { height: 10 }, rootBounds: { height: 10 } })).toBe(false);
    expect(schedulerHalfVisible({ isIntersecting: true, intersectionRatio: 0.5, intersectionRect: { height: 10 }, rootBounds: { height: 800 } })).toBe(true);
    const stop = watchSchedulerOpened(() => calls.push("open"));
    expect(calls).toEqual([]);
    expect(observed).toBe(false);
    for (const fn of loadListeners) fn({ target: iframe });
    for (const fn of loadListeners) fn({ target: iframe });
    expect(calls).toEqual(["open"]);
    stop();
    if (previous) vi.stubGlobal("IntersectionObserver", previous);
  });

  it("starts the visibility watch when the booking iframe already has a resized height", () => {
    installBrowser();
    const previous = globalThis.IntersectionObserver;
    let observed = false;
    class FakeObserver {
      constructor(private readonly callback: (entries: unknown[]) => void) {}
      observe() {
        observed = true;
        this.callback([
          {
            isIntersecting: true,
            intersectionRatio: 0.8,
            intersectionRect: { height: 700 },
            rootBounds: { height: 900 },
          },
        ]);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const iframe = { tagName: "IFRAME", dataset: {} as Record<string, string>, style: { height: "1008px" }, src: "" };
    const root = {
      addEventListener() {},
      removeEventListener() {},
      querySelector() {
        return iframe;
      },
      contains() {
        return false;
      },
    };
    vi.stubGlobal("document", {
      ...(globalThis.document as object),
      getElementById(id: string) {
        return id === "book" ? root : null;
      },
    });
    const calls: string[] = [];
    const stop = watchSchedulerOpened(() => calls.push("open"));
    expect(observed).toBe(true);
    expect(iframe.dataset.jrLoaded).toBe("1");
    expect(calls).toEqual(["open"]);
    stop();
    if (previous) vi.stubGlobal("IntersectionObserver", previous);
  });

  it("sends one page view from startJourneyTracking and ignores a second start", async () => {
    installBrowser("/contact/");
    startJourneyTracking();
    startJourneyTracking();
    await vi.waitFor(() => expect(sent.some((body) => body.includes("page_view"))).toBe(true));
    const views = sent.filter((body) => body.includes('"event":"page_view"'));
    expect(views).toHaveLength(1);
    expect(JSON.parse(views[0]!)).toMatchObject({
      visitorId: VISITOR,
      sessionId: SESSION,
      currentPath: "/contact/",
      entry: "test-offer",
    });
  });
});
