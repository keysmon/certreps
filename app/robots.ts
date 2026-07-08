import type { MetadataRoute } from "next";
import { listCerts } from "@/lib/certs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: listCerts().map((c) => `/aws/${c.certId}/practice`) }],
    sitemap: "https://certreps.dev/sitemap.xml",
  };
}
