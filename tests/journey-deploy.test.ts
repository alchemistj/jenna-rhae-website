import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./helpers";

/** import/export from "./file.ts" and import("./file.ts"), relative only. */
const RELATIVE_TS_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)\s*["'](\.[^"']+\.ts)["']/g;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(?:[cm]?[jt]s|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Vercel unbundled entrypoints", () => {
  it("does not import a relative path ending in .ts from api/, server/, or middleware.ts", () => {
    const files = [
      path.join(ROOT, "middleware.ts"),
      ...sourceFiles(path.join(ROOT, "api")),
      ...sourceFiles(path.join(ROOT, "server")),
    ];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(RELATIVE_TS_IMPORT)) {
        hits.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("leaves middleware and /api/site-events to Vercel, and does not mark pages no-store", () => {
    const config = JSON.parse(readFileSync(path.join(ROOT, ".vercel", "output", "config.json"), "utf8")) as {
      routes: Array<Record<string, unknown> & { headers?: Record<string, string> }>;
    };
    const injected = config.routes.filter(
      (route) => route.middlewarePath === "_middleware" || route.dest === "api/site-events",
    );
    expect(injected).toEqual([]);
    const noStore = config.routes.filter((route) => JSON.stringify(route.headers ?? {}).includes("no-store"));
    expect(noStore).toEqual([]);
  });
});
