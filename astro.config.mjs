import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://jennarhae.com",
  output: "static",
  adapter: vercel(),
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
