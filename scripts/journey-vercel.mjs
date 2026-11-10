/**
 * Astro's static adapter does not emit a root middleware.ts or api/*.ts into
 * the Build Output. Copy this site's journey middleware and collect proxy into
 * .vercel/output so Vercel runs them without marking HTML pages no-store.
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Page requests only. Anchored so `/api/site-events/` is not a substring match. */
export const JOURNEY_MIDDLEWARE_SRC =
  "^/(?!api(?:/|$)|_astro(?:/|$)|images(?:/|$)|fonts(?:/|$)|favicon|robots\\.txt|sitemap|llms).*";

export const JOURNEY_API_SRC = "^/api/site-events/?$";

export function withJourneyRoutes(routes) {
  const kept = (Array.isArray(routes) ? routes : []).filter(
    (route) => route?.middlewarePath !== "_middleware" && route?.dest !== "api/site-events",
  );
  return [
    { src: JOURNEY_API_SRC, dest: "api/site-events" },
    { src: JOURNEY_MIDDLEWARE_SRC, middlewarePath: "_middleware", continue: true },
    ...kept,
  ];
}

async function bundle(entry, outfile, platform) {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform,
    target: platform === "node" ? "node22" : "es2022",
    logLevel: "silent",
  });
}

export async function installJourneyOutput(projectRoot = root) {
  const outDir = path.join(projectRoot, ".vercel", "output");
  const configPath = path.join(outDir, "config.json");
  if (!existsSync(configPath)) {
    throw new Error("journey tracking expected .vercel/output/config.json after the Astro build");
  }

  const middlewareDir = path.join(outDir, "functions", "_middleware.func");
  mkdirSync(middlewareDir, { recursive: true });
  await bundle(path.join(projectRoot, "middleware.ts"), path.join(middlewareDir, "index.js"), "neutral");
  writeFileSync(
    path.join(middlewareDir, ".vc-config.json"),
    JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2) + "\n",
  );

  const apiDir = path.join(outDir, "functions", "api", "site-events.func");
  mkdirSync(apiDir, { recursive: true });
  await bundle(path.join(projectRoot, "api", "site-events.ts"), path.join(apiDir, "index.js"), "node");
  writeFileSync(path.join(apiDir, "package.json"), JSON.stringify({ type: "module" }) + "\n");
  writeFileSync(
    path.join(apiDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.js",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
      },
      null,
      2,
    ) + "\n",
  );

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.routes = withJourneyRoutes(config.routes);
  writeFileSync(configPath, JSON.stringify(config, null, "\t") + "\n");
}

export function journeyVercelIntegration() {
  return {
    name: "journey-vercel",
    hooks: {
      "astro:build:done": async () => {
        await installJourneyOutput(root);
      },
    },
  };
}
