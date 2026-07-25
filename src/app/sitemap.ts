import type { MetadataRoute } from "next";
import { divisions, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/projects", "/contact"];
  const divisionRoutes = divisions.map((division) => `/${division.slug}`);

  return [...routes, ...divisionRoutes].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
