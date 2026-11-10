/**
 * Load journey tracking after the window load event so it does not compete
 * with first paint. The measurement module itself is fetched only then.
 */
export function scheduleJourney(): void {
  const start = () => {
    void import("./bootstrap").then(({ startJourneyTracking }) => {
      startJourneyTracking();
    });
  };
  if (typeof document !== "undefined" && document.readyState === "complete") start();
  else if (typeof window !== "undefined") window.addEventListener("load", start, { once: true });
}
