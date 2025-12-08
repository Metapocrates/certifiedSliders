import { NextResponse } from "next/server";
import { getAthleteProfiles } from "@/lib/seo/sitemap";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shard: string }> }
) {
  const resolvedParams = await params;
  const shardIndex = parseInt(resolvedParams.shard, 10);
  const perShard = 40000;
  const offset = shardIndex * perShard;

  const profiles = await getAthleteProfiles(perShard, offset);

  const urls = profiles
    .map((profile) => {
      const lastmod = new Date(profile.updated_at).toISOString();
      return `
  <url>
    <loc>https://www.certifiedsliders.com/athletes/${profile.profile_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
