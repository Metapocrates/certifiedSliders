const FALLBACK_URL = "http://localhost:3000";

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/+$/, "");

  const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_SITE_URL;
  if (siteUrl && siteUrl.trim().length > 0) return siteUrl.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    const prefixed = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    return prefixed.replace(/\/+$/, "");
  }

  return FALLBACK_URL;
}
