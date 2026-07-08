import type { MetadataRoute } from "next";
import { listCerts } from "@/lib/certs";
import { listGuides } from "@/lib/guides";

const BASE = "https://certreps.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/catalog`, priority: 0.9 },
    ...listCerts().flatMap((c) => [
      { url: `${BASE}/aws/${c.certId}`, priority: 0.9 },
      ...listGuides(c.certId).map((g) => ({ url: `${BASE}/guides/${c.certId}/${g.slug}`, priority: 0.7 })),
    ]),
  ];
}
