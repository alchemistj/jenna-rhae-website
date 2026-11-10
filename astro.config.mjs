import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { journeyVercelIntegration } from "./scripts/journey-vercel.mjs";

export default defineConfig({
  site: "https://jennarhae.com",
  output: "static",
  adapter: vercel(),
  integrations: [journeyVercelIntegration()],
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
