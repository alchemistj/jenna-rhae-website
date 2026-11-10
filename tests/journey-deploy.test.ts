import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JOURNEY_API_SRC, JOURNEY_MIDDLEWARE_SRC, withJourneyRoutes } from "../scripts/journey-vercel.mjs";
import { ROOT } from "./helpers";

describe("Vercel build output", () => {
  it("puts the collect route and a continuing middleware route ahead of the filesystem", () => {
    const once = withJourneyRoutes([
      { src: "^/contact$", headers: { Location: "/contact/" }, status: 308 },
      { handle: "filesystem" },
    ]);
    expect(once[0]).toEqual({ src: JOURNEY_API_SRC, dest: "api/site-events" });
    expect(once[1]).toEqual({
      src: JOURNEY_MIDDLEWARE_SRC,
      middlewarePath: "_middleware",
      continue: true,
    });
    expect(once[1]).not.toHaveProperty("headers");
    expect(once.at(-1)).toEqual({ handle: "filesystem" });
    expect(withJourneyRoutes(once)).toEqual(once);
    expect(JOURNEY_MIDDLEWARE_SRC.startsWith("^/")).toBe(true);
  });

  it("emits the edge middleware and the Reports proxy without no-store on pages", () => {
    const configPath = path.join(ROOT, ".vercel", "output", "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      routes: Array<Record<string, unknown> & { headers?: Record<string, string> }>;
    };
    expect(config.routes[0]).toMatchObject({ src: JOURNEY_API_SRC, dest: "api/site-events" });
    expect(config.routes[1]).toMatchObject({
      src: JOURNEY_MIDDLEWARE_SRC,
      middlewarePath: "_middleware",
      continue: true,
    });
    expect(JSON.stringify(config.routes[1])).not.toContain("no-store");
    const noStore = config.routes.filter((route) =>
      JSON.stringify(route.headers ?? {}).includes("no-store"),
    );
    expect(noStore).toEqual([]);
    const middlewareFile = path.join(ROOT, ".vercel", "output", "functions", "_middleware.func", "index.js");
    const apiFile = path.join(ROOT, ".vercel", "output", "functions", "api", "site-events.func", "index.js");
    expect(existsSync(middlewareFile)).toBe(true);
    expect(existsSync(apiFile)).toBe(true);
    expect(readFileSync(middlewareFile, "utf8")).toContain("ff_vid");
    const api = readFileSync(apiFile, "utf8");
    expect(api).toContain("https://ff-reports-analytics.vercel.app/api/measurement/collect");
    expect(api).toContain("x-ff-client-user-agent");
  });
});
