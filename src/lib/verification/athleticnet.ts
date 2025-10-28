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
  const cleaned = html
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .toUpperCase();

  return cleaned.includes(nonce.toUpperCase());
}

export async function fetchPageContainsNonce(url: string, nonce: string): Promise<boolean> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "CertifiedSliders/1.0 (+https://certifiedsliders.com)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    return false;
  }

  const html = await res.text();
  return containsNonce(html, nonce);
}

