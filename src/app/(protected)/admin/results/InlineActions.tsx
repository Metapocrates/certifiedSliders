// src/app/(protected)/admin/results/InlineActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveResultAction, rejectResultAction } from "./actions";

export default function InlineActions({ id }: { id: string }) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [rejectOpen, setRejectOpen] = useState(false);
    const [reason, setReason] = useState("");

    const approve = () =>
        start(async () => {
            try {
                const fd = new FormData();
                fd.append("id", id);
                const res = await approveResultAction(fd);
                if (res?.ok) {
                    toast.success("Result approved ✅");
                    router.refresh();
                } else {
                    toast.error(res?.error ?? "Error approving result");
                }
            } catch {
                toast.error("Unexpected error approving");
            }
        });

    const reject = () =>
        start(async () => {
            try {
                const fd = new FormData();
                fd.append("id", id);
                if (reason.trim()) fd.append("reason", reason.trim());
                const res = await rejectResultAction(fd);
                if (res?.ok) {
                    toast.success("Result rejected ❌");
                    setRejectOpen(false);
                    setReason("");
                    router.refresh();
                } else {
                    toast.error(res?.error ?? "Error rejecting result");
                }
            } catch {
                toast.error("Unexpected error rejecting");
            }
        });

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={approve}
                disabled={pending}
                className={`rounded-md bg-green-600 px-3 py-1.5 text-white text-xs ${pending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                    }`}
            >
                {pending ? "Working…" : "Approve"}
            </button>

            <div className="relative">
                <button
                    onClick={() => setRejectOpen((v) => !v)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-white text-xs hover:opacity-90"
                >
                    Reject
                </button>
                {rejectOpen && (
                    <div className="absolute z-10 mt-2 w-64 rounded-lg border bg-white p-3 shadow">
                        <div className="space-y-2">
                            <textarea
                                rows={3}
                                className="w-full rounded-md border px-2 py-1 text-xs"
                                placeholder="Optional reason…"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    onClick={() => setRejectOpen(false)}
                                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={reject}
                                    disabled={pending}
                                    className={`rounded-md bg-red-600 px-3 py-1.5 text-white text-xs ${pending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                                        }`}
                                >
                                    {pending ? "Working…" : "Confirm Reject"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}