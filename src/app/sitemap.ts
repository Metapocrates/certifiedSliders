// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://certifiedsliders.com";

    return [
        {
            url: `${BASE}/`,
            lastModified: new Date(),
        },
        {
            url: `${BASE}/rankings`,
            lastModified: new Date(),
        },
        // Add more public pages as they’re created
    ];
}
