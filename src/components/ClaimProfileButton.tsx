"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
    profileId: string;
    backPath: string; // where to return after claim
};

export default function ClaimProfileButton({ profileId, backPath }: Props) {
    const router = useRouter();
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    async function handleClaim() {
        setErr(null);
        try {
            const res = await fetch("/api/profile/claim", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ profileId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.ok === false) {
                throw new Error(data?.error || "Claim failed");
            }
            // hard refresh to reflect claim immediately
            startTransition(() => router.replace(backPath));
        } catch (e: any) {
            setErr(e?.message || "Unable to claim this profile.");
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleClaim}
                disabled={pending}
                className={`rounded-md border px-3 py-2 text-sm hover:opacity-90 ${pending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
                {pending ? "Claiming…" : "Claim this profile"}
            </button>
            {err ? <span className="text-sm text-red-600">{err}</span> : null}
        </div>
    );
}