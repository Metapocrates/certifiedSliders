import { NextResponse } from "next/server";

export const runtime = "edge";

const EVENTS = [
  "100m", "200m", "400m", "800m", "1600m", "3200m",
  "110mh", "300mh", "4x100m", "4x400m",
  "high-jump", "pole-vault", "long-jump", "triple-jump",
  "shot-put", "discus", "javelin"
];

export async function GET(
  request: Request,
  { params }: { params: { year: string } }
) {
  const { year } = params;

  const urls = EVENTS.map((event) => {
    return `
  <url>
    <loc>https://www.certifiedsliders.com/rankings?year=${year}&amp;event=${event}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.certifiedsliders.com/rankings?year=${year}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
