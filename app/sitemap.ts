import type { MetadataRoute } from "next";
import { listCerts } from "@/lib/certs";
import { certPath } from "@/lib/routes";
import { listIncidents } from "@/lib/incidents";
import { listGuides } from "@/lib/guides";

const BASE = "https://certreps.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/catalog`, priority: 0.9 },
    { url: `${BASE}/learn`, priority: 0.8 },
    { url: `${BASE}/aws/aip-c01/incidents`, priority: 0.7 },
    ...listIncidents().map(item => ({url: `${BASE}/aws/aip-c01/incidents/${item.id}`, priority: 0.6})),
    ...listCerts().flatMap((c) => [
      { url: `${BASE}${certPath(c)}`, priority: 0.9 },
      { url: `${BASE}${certPath(c)}/learn`, priority: 0.8 },
      ...listGuides(c.certId).map((g) => ({ url: `${BASE}/guides/${c.certId}/${g.slug}`, priority: 0.7 })),
    ]),
  ];
}
