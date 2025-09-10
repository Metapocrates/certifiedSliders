// src/lib/proofs/whitelist.ts

// Base domains we trust. Subdomains (e.g. live.athletic.net, ca.milesplit.com) will be allowed too.
const ALLOW = ["athletic.net", "milesplit.com"];

export function isAllowedUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return ALLOW.some(
            (base) => u.hostname === base || u.hostname.endsWith(`.${base}`)
        );
    } catch {
        return false;
    }
}
