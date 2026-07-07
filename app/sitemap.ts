import type { MetadataRoute } from "next";
import { listGuides } from "@/lib/guides";

const BASE = "https://certreps.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/aws/aip-c01`, priority: 0.9 },
    ...listGuides("aip-c01").map((g) => ({ url: `${BASE}/guides/aip-c01/${g.slug}`, priority: 0.7 })),
  ];
}
