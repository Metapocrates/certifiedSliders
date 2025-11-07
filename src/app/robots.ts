// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://certifiedsliders.com";

    return {
        rules: [
            {
                userAgent: "*",
                disallow: ["/admin", "/me", "/coach"],
            },
        ],
        sitemap: `${BASE}/sitemap.xml`,
    };
}
