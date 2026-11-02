import type { APIRoute } from "astro";
import { pages } from "../data/pages";
import { buildLlms } from "../lib/seoFiles";

export const GET: APIRoute = () => {
  const descriptions = Object.fromEntries(Object.values(pages).map((page) => [page.path, page.seo.description]));
  return new Response(buildLlms(descriptions), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
