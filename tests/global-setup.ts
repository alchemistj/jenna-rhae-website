import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The build-output tests read dist/. Build once before they run. Set SKIP_BUILD=1 to reuse an existing dist/
 * (for example right after `npm run build`).
 */
export default function setup() {
  const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
  if (process.env.SKIP_BUILD === "1" && existsSync(path.join(root, "dist", "index.html"))) return;
  execFileSync("npx", ["astro", "build"], { cwd: root, stdio: "inherit" });
}
