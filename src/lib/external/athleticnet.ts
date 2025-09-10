import crypto from "crypto";

// Normalize & extract the canonical external_id from an Athletic.net profile URL.
// Supports formats like:
//  - https://www.athletic.net/profile/TresOnyejekwe1
//  - https://athletic.net/profile/12345678   (if they ever expose numeric)
// Returns { externalId, canonicalUrl }
export function normalizeAthleticNetProfileUrl(input: string): { externalId: string; canonicalUrl: string } {
    const u = new URL(input.trim());
    if (!/athletic\.net$/.test(u.hostname) && !/athleticnet$/.test(u.hostname)) {
        throw new Error("Not an athletic.net URL.");
    }
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) => p.toLowerCase() === "profile");
    if (i < 0 || !parts[i + 1]) throw new Error("Couldn’t find /profile/<id>.");
    const externalId = parts[i + 1];
    return {
        externalId,
        canonicalUrl: `https://www.athletic.net/profile/${externalId}`,
    };
}

export function makeNonce(): string {
    return crypto.randomBytes(12).toString("hex"); // short but unique
}

/**
 * Very light HTML check for nonce presence.
 * We only fetch WHEN THE USER CLICKS "Check", never in background.
 */
export async function pageContainsNonce(url: string, nonce: string): Promise<boolean> {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": "CertifiedSliders/1.0" } });
    if (!res.ok) return false;
    const html = await res.text();
    // Look in feed post bodies or "About" sections; keep loose to be robust to markup changes.
    const re = new RegExp(nonce.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return re.test(html);
}
