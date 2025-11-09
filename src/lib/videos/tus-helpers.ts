/**
 * Helper functions for tus resumable uploads with Cloudflare Stream
 */

/**
 * Build tus Upload-Metadata header for Cloudflare Stream
 * @param maxDurationSeconds Max video duration in seconds (default: 600 = 10 min)
 * @param ttlMinutes Time-to-live for unused upload reservation (default: 60 min)
 * @param requireSignedUrls Whether to require signed URLs for playback (default: false)
 * @returns Base64-encoded metadata string for Upload-Metadata header
 */
export function buildTusMetadata(
  maxDurationSeconds = 600,
  ttlMinutes = 60,
  requireSignedUrls = false
): string {
  const expiryISO = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

  const pairs: Array<[string, string]> = [
    ['maxDurationSeconds', btoa(String(maxDurationSeconds))],
    ['expiry', btoa(expiryISO)],
  ];

  // Add requiresignedurls flag if needed (empty value is allowed)
  if (requireSignedUrls) {
    pairs.push(['requiresignedurls', '']);
  }

  return pairs.map(([k, v]) => (v ? `${k} ${v}` : k)).join(',');
}

/**
 * Extract video UID from Cloudflare Stream tus Location header
 * Location format: https://api.cloudflare.com/client/v4/accounts/{account}/stream/{uid}
 */
export function extractUidFromLocation(location: string): string | null {
  const match = location.match(/\/stream\/([a-f0-9]+)$/i);
  return match ? match[1] : null;
}

/**
 * Determine if file should use basic or tus upload based on size
 * Cloudflare recommends tus for files >200MB
 */
export const UPLOAD_SIZE_THRESHOLD = 200 * 1024 * 1024; // 200 MB

export function shouldUseTus(fileSize: number): boolean {
  return fileSize > UPLOAD_SIZE_THRESHOLD;
}
