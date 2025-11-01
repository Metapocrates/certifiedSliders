const ATHLETIC_HOST_PATTERN = /(^|\.)athletic\.net$/i;

export function parseAthleticNetSlug(profileUrl: string): string {
  const url = new URL(profileUrl.trim());
  const hostname = url.hostname.replace(/^www\./i, "");
  if (!ATHLETIC_HOST_PATTERN.test(hostname)) {
    throw new Error("Not an athletic.net URL");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const lowered = segments.map((seg) => seg.toLowerCase());
  const profileIdx = lowered.findIndex((segment) => segment === "profile" || segment === "athlete");
  if (profileIdx === -1 || !segments[profileIdx + 1]) {
    throw new Error("Expected /profile/<slug> or /athlete/<id> in the URL");
  }

  return segments[profileIdx + 1];
}

export function parseAthleticNetResultId(resultUrl: string): string {
  const url = new URL(resultUrl.trim());
  const hostname = url.hostname.replace(/^www\./i, "");
  if (!ATHLETIC_HOST_PATTERN.test(hostname)) {
    throw new Error("Not an athletic.net URL");
  }

  const match = url.pathname.match(/\/result\/([A-Za-z0-9]+)/i);
  if (!match || !match[1]) {
    throw new Error("Could not find result id in URL");
  }
  return match[1];
}

export function parseAthleticNetNumericId(profileUrl: string): string | null {
  try {
    const url = new URL(profileUrl.trim());
    const hostname = url.hostname.replace(/^www\./i, "");
    if (!ATHLETIC_HOST_PATTERN.test(hostname)) {
      return null;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    const lower = segments.map((seg) => seg.toLowerCase());
    const athleteIdx = lower.findIndex((segment) => segment === "athlete");
    if (athleteIdx !== -1 && segments[athleteIdx + 1]) {
      const candidate = segments[athleteIdx + 1].replace(/[^0-9]/g, "");
      return candidate.length ? candidate : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function safeFetchHtml(targetUrl: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "User-Agent": "CertifiedSlidersBot/1.0 (+https://certifiedsliders.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to load page: ${response.status}`);
  }

  const html = await response.text();
  return { html, finalUrl: response.url };
}

const SLUG_MATCHERS: RegExp[] = [
  /href=["'](?:https?:\/\/(?:www\.)?athletic\.net)?\/profile\/([A-Za-z0-9_-]+)/i,
  /"profileUrl"\s*:\s*"(?:https?:\/\/(?:www\.)?athletic\.net)?\/profile\/([A-Za-z0-9_-]+)"/i,
  /@([A-Za-z0-9_-]+)(?=["'<>\s])/i,
];

export function extractSlugFromHtml(html: string): string | null {
  for (const matcher of SLUG_MATCHERS) {
    const m = html.match(matcher);
    if (m && m[1]) {
      return m[1];
    }
  }
  return null;
}

export function extractCanonicalProfileUrl(html: string): string | null {
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  if (canonicalMatch && canonicalMatch[1]) {
    return canonicalMatch[1];
  }
  return null;
}

export function extractNumericIdFromHtml(html: string): string | null {
  const match = html.match(/\/athlete\/([0-9]{4,})/i);
  return match && match[1] ? match[1] : null;
}
