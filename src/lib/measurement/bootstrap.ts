import { captureAttributionOnEntry } from "../attribution/storage";
import {
  beginPageEngagement,
  buildMeasurementEvent,
  collectMeasurementEvent,
  collectPageView,
  pageViewEventIdFor,
  releasePageViewForRestore,
  resetMeasurementForTests,
  signalPageEngaged,
} from "./collect";
import { watchEngagedSignal } from "./engaged";
import { bindJourneyContactClicks } from "./interactions";
import { watchSchedulerOpened } from "./scheduler";

let stopContactClicks: (() => void) | undefined;
let stopScheduler: (() => void) | undefined;
let stopEngagement: (() => void) | undefined;
let listenersArmed = false;

/** Contact clicks can land before the load event. Page views stay behind load. */
export function armJourneyListeners(): void {
  if (listenersArmed || typeof window === "undefined") return;
  listenersArmed = true;
  stopContactClicks = bindJourneyContactClicks();
}

/**
 * One page view per document load, plus one more when the page returns from
 * the back/forward cache. Sends after load. Does not block rendering.
 */
export function startJourneyTracking(): void {
  if (typeof window === "undefined") return;
  captureAttributionOnEntry(window.location.pathname, window.location.search);
  armJourneyListeners();
  if (window.__JENNA_JOURNEY_TRACKING__) return;
  window.__JENNA_JOURNEY_TRACKING__ = true;

  const sendPageView = () => {
    const path = window.location.pathname;
    captureAttributionOnEntry(path, window.location.search);
    const token = beginPageEngagement(path);
    stopEngagement?.();
    stopEngagement = watchEngagedSignal(() => {
      if (signalPageEngaged(token) !== "follow-up") return;
      const eventId = pageViewEventIdFor(token);
      if (!eventId) return;
      void collectMeasurementEvent(
        buildMeasurementEvent("page_view", {
          currentPath: path,
          engaged: true,
          eventId,
        }),
      );
    });
    stopScheduler?.();
    stopScheduler = watchSchedulerOpened();
    void collectPageView();
  };
  if (document.readyState === "complete") sendPageView();
  else window.addEventListener("load", sendPageView, { once: true });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    releasePageViewForRestore();
    sendPageView();
  });
}

export function resetJourneyTrackingForTests(): void {
  stopContactClicks?.();
  stopContactClicks = undefined;
  stopScheduler?.();
  stopScheduler = undefined;
  stopEngagement?.();
  stopEngagement = undefined;
  listenersArmed = false;
  if (typeof window !== "undefined") delete window.__JENNA_JOURNEY_TRACKING__;
  resetMeasurementForTests();
}

declare global {
  interface Window {
    __JENNA_JOURNEY_TRACKING__?: boolean;
    /** Test-only. Local preview does not send unless this is true. */
    __JENNA_JOURNEY_SEND_LOCAL__?: boolean;
  }
}
