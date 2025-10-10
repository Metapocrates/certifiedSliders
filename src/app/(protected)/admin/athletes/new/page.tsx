"use client";

import { useState } from "react";
import { createProfileAction } from "./actions";

export default function AdminNewAthletePage() {
    const [msg, setMsg] = useState<string | null>(null);
    const [claimUrl, setClaimUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMsg(null);
        setClaimUrl(null);
        setBusy(true);
        try {
            const formData = new FormData(e.currentTarget);
            const res = await createProfileAction(formData);
            if (!res.ok) {
                setMsg(res.error || "Error creating profile.");
            } else {
                setMsg("Profile created. Share this claim link with the athlete.");
                setClaimUrl(res.claimUrl ?? null); // <- fix: guard undefined
                e.currentTarget.reset();
            }
        } catch (err: any) {
            setMsg(err?.message || "Unexpected error.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container max-w-xl py-8">
            <h1 className="text-2xl font-semibold mb-4">Create Athlete Profile</h1>
            <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input name="username" className="w-full rounded border px-3 py-2" required />
                    <p className="text-xs text-muted mt-1">Unique handle for profile URL.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Full name</label>
                    <input name="full_name" className="w-full rounded border px-3 py-2" required />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Class year</label>
                    <input
                        name="class_year"
                        type="number"
                        min={2024}
                        className="w-full rounded border px-3 py-2"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">School (optional)</label>
                    <input name="school_name" className="w-full rounded border px-3 py-2" />
                </div>

                <button className="btn" disabled={busy}>
                    {busy ? "Creating…" : "Create"}
                </button>

                {msg && <div className="text-sm">{msg}</div>}
                {claimUrl && (
                    <div className="rounded-lg border p-3 text-sm">
                        <div className="font-medium mb-1">Claim link</div>
                        <div className="break-all">{claimUrl}</div>
                    </div>
                )}
            </form>
        </div>
    );
}