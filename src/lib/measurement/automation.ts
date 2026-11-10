export type AutomationNavigator = {
  webdriver?: boolean;
  userAgent?: string;
  languages?: { readonly length: number } | null;
};

function currentNavigator(): AutomationNavigator | undefined {
  if (typeof window !== "undefined" && window.navigator) return window.navigator;
  if (typeof navigator !== "undefined") return navigator;
  return undefined;
}

/** The split-testing tracker rule: webdriver, HeadlessChrome, or no languages. */
export function automationDetected(nav?: AutomationNavigator | null): boolean {
  const source = nav === undefined ? currentNavigator() : nav;
  if (!source) return false;
  return (
    source.webdriver === true ||
    /HeadlessChrome/.test(source.userAgent ?? "") ||
    source.languages?.length === 0
  );
}

/** True only for the three automation rules. Callers omit the key otherwise. */
export function journeyAutomationForPayload(nav?: AutomationNavigator | null): boolean {
  return automationDetected(nav);
}
