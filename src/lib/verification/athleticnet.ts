// src/lib/verification/athleticnet.ts

const ATHLETIC_HOST_PATTERN = /(^|\.)athletic\.net$/i;

export function parseAthleticNetExternalId(input: string): {
  externalId: string;
  canonicalUrl: string;
} {
  const url = new URL(input.trim());

  if (!ATHLETIC_HOST_PATTERN.test(url.hostname.replace(/www\./i, ""))) {
    throw new Error("Not an athletic.net URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const profileIndex = segments.findIndex((segment) => segment.toLowerCase() === "profile");

  if (profileIndex === -1 || !segments[profileIndex + 1]) {
    throw new Error("Couldn’t find /profile/<id> in the URL.");
  }

  const externalId = segments[profileIndex + 1];

  return {
    externalId,
    canonicalUrl: `https://www.athletic.net/profile/${externalId}`,
  };
}

export function makeNonce(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let nonce = "CS-";
  for (let i = 0; i < length; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}

export function containsNonce(html: string, nonce: string): boolean {
  const cleanWhitespace = html
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .toUpperCase();

  const normalizeDashes = (value: string) =>
    value
      .replace(/[\u2010-\u2015\u2212\u00AD]/g, "-") // map fancy dashes & soft hyphen
      .replace(/&#8209;/g, "-")
      .replace(/\u200B/g, ""); // zero-width space

  const cleaned = normalizeDashes(cleanWhitespace);
  const target = normalizeDashes(nonce.toUpperCase());

  if (cleaned.includes(target)) return true;

  // Some feeds inject extra separators, fall back to ignoring hyphen differences.
  const squashed = cleaned.replace(/-/g, "");
  const targetSquashed = target.replace(/-/g, "");
  if (targetSquashed.length > 0 && squashed.includes(targetSquashed)) return true;

  // Final fallback: ignore all non-alphanumeric characters to tolerate emoji or bullet separators.
  const alnumSource = cleaned.replace(/[^A-Z0-9]/g, "");
  const alnumTarget = target.replace(/[^A-Z0-9]/g, "");
  return alnumTarget.length > 0 && alnumSource.includes(alnumTarget);
}

export async function fetchPageContainsNonce(url: string, nonce: string): Promise<boolean> {
  const normalized = url.replace(/\/+$/, "");
  const candidates = new Set<string>([
    normalized,
    `${normalized}/feed`,
    `${normalized}/about`,
  ]);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        method: "GET",
        headers: {
          "User-Agent": "CertifiedSliders/1.0 (+https://certifiedsliders.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) continue;

      const html = await res.text();
      if (containsNonce(html, nonce)) {
        return true;
      }
    } catch {
      // ignore fetch errors and continue with next candidate
    }
  }

  return false;
}
