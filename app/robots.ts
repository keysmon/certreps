import type { MetadataRoute } from "next";
import { listCerts } from "@/lib/certs";
import { practicePath } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: listCerts().map((c) => practicePath(c)) }],
    sitemap: "https://certreps.dev/sitemap.xml",
  };
}
