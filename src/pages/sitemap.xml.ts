import type { APIRoute } from "astro";
import { tools } from "../data/tools";
export const GET: APIRoute = () => {
  const routes = ["", "privacy/", ...tools.map((t) => `tools/${t.slug}/`)];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((r) => `<url><loc>https://glacialpigeon.github.io/media-tools/${r}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
