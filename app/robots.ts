import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/aws/aip-c01/practice"] }],
    sitemap: "https://certreps.dev/sitemap.xml",
  };
}
