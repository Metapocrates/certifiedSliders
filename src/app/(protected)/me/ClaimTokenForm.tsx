// src/app/(protected)/me/ClaimTokenForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimTokenForm({ redirectAfter = "/me" }: { redirectAfter?: string }) {
    const router = useRouter();
    const [token, setToken] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [kind, setKind] = useState<"idle" | "success" | "error">("idle");

    async function onClaim() {
        if (!token) {
            setKind("error");
            setMsg("Paste a claim token.");
            return;
        }
        setBusy(true);
        setMsg(null);
        setKind("idle");
        try {
            const res = await fetch("/api/profile/claim", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token }),
            });

            if (res.status === 401) {
                setKind("error");
                setMsg("You must be signed in to claim a profile.");
                return;
            }

            const data = await res.json();
            if (data?.ok) {
                setKind("success");
                setMsg("Success! Profile claimed.");
                // give a moment for UX, then refresh
                setTimeout(() => {
                    router.push(redirectAfter);
                    router.refresh();
                }, 600);
            } else {
                setKind("error");
                setMsg(data?.error || "Invalid or already-used token.");
            }
        } catch (e: any) {
            setKind("error");
            setMsg(e?.message || "Unexpected error.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    className="flex-1 rounded-lg border px-3 py-2"
                    placeholder="Paste claim token…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={busy}
                />
                <button className="btn" onClick={onClaim} disabled={busy}>
                    {busy ? "Working…" : "Claim"}
                </button>
            </div>
            {msg && (
                <div
                    className={`rounded-md border px-3 py-2 text-sm ${kind === "success"
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-red-300 bg-red-50 text-red-700"
                        }`}
                >
                    {msg}
                </div>
            )}
        </div>
    );
}