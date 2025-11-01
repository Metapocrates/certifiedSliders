"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiResp =
    | { ok: true }
    | { ok: false; error?: string };

export default function ClaimPage() {
    const router = useRouter();
    const search = useSearchParams();
    // Support both ?t= (new Athletic.net flow) and ?token= (legacy profile claim)
    const initialToken = useMemo(() => search.get("t") || search.get("token") || "", [search]);

    const [token, setToken] = useState(initialToken);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    // If a token is present in the URL, auto-submit once on mount
    useEffect(() => {
        if (initialToken) {
            void handleClaim(initialToken, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialToken]);

    async function handleClaim(t: string, silent = false) {
        if (!t) {
            setStatus("error");
            setMsg("Please paste a claim token.");
            return;
        }
        setBusy(true);
        if (!silent) {
            setMsg(null);
            setStatus("idle");
        }
        try {
            const res = await fetch("/api/profile/claim", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token: t }),
            });

            if (res.status === 401) {
                setStatus("error");
                setMsg("You must be signed in to claim a profile.");
                return;
            }

            const data = (await res.json()) as ApiResp;

            if (data.ok) {
                setStatus("success");
                setMsg("Success! Profile claimed. Redirecting…");
                setTimeout(() => router.push("/me"), 1000);
            } else {
                setStatus("error");
                setMsg(data.error || "Invalid or already-used token.");
            }
        } catch (e: any) {
            setStatus("error");
            setMsg(e?.message || "Unexpected error.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container max-w-lg py-10">
            <h1 className="text-2xl font-semibold mb-3">Claim Profile</h1>
            <p className="text-sm text-muted mb-6">
                If you received a claim link, it includes a token. If you landed here from that link,
                we’ll try to claim automatically. Otherwise, paste the token below.
            </p>

            <div className="space-y-3 rounded-xl border p-4">
                <label className="block text-sm font-medium">Claim token</label>
                <input
                    className="w-full rounded border px-3 py-2"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste token from your claim link"
                    disabled={busy}
                />
                <div className="flex items-center gap-3">
                    <button
                        className="btn"
                        onClick={() => handleClaim(token)}
                        disabled={busy}
                    >
                        {busy ? "Working…" : "Claim"}
                    </button>
                    <a href="/login?next=/claim" className="text-sm underline">
                        Sign in
                    </a>
                </div>

                {msg && (
                    <div
                        className={`rounded-md border px-3 py-2 text-sm ${status === "success"
                                ? "border-green-300 bg-green-50 text-green-800"
                                : "border-red-300 bg-red-50 text-red-700"
                            }`}
                    >
                        {msg}
                    </div>
                )}
            </div>
        </div>
    );
}