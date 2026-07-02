import type { MetadataRoute } from "next";

// Keep the owner login page (/admin) out of search indexes so the single
// write-capable auth endpoint isn't advertised to crawlers/credential-stuffers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    host: "https://files.shivamvashisth.com",
  };
}
