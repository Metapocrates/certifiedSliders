/**
 * Environment detection and configuration helpers
 *
 * Use these to safely branch logic between production, staging, and local dev
 */

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

// Environment detection
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';

export const IS_PROD = SITE_URL === 'https://certifiedsliders.com';
export const IS_STAGING = SITE_URL.includes('vercel.app') || SITE_URL.includes('staging');
export const IS_LOCAL = SITE_URL.includes('localhost') || SITE_URL.includes('127.0.0.1');

/**
 * Environment name for logging/debugging
 */
export function getEnvironment(): 'production' | 'staging' | 'local' | 'unknown' {
  if (IS_PROD) return 'production';
  if (IS_STAGING) return 'staging';
  if (IS_LOCAL) return 'local';
  return 'unknown';
}

/**
 * Check if we should allow potentially destructive operations
 * Use this to gate emails, webhooks, payments, etc. in non-prod environments
 */
export function canSendExternalRequests(): boolean {
  return IS_PROD;
}

/**
 * Get the appropriate redirect URL for OAuth callbacks
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || SITE_URL || '';
}
