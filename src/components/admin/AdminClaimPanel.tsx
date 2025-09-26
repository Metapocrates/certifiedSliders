"use client";

import { useTransition } from "react";
// reuse the existing server actions you already created
// src/components/admin/AdminClaimPanel.tsx
import { adminApproveClaimAction, adminDenyClaimAction } from "@/actions/claims";


export default function AdminClaimPanel({
  slug,
  claims,
}: {
  slug: string;
  claims: { id: string; user_id: string; status: string; created_at: string }[];
}) {
  const [busy, start] = useTransition();

  if (!claims || claims.length === 0) {
    return <p className="text-sm opacity-70">No pending claims.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm">Admin: Pending Claims</div>
      <ul className="space-y-1">
        {claims.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span>
              user {c.user_id.slice(0, 8)}… • {new Date(c.created_at).toLocaleString()}
            </span>
            <span className="flex gap-2">
              <button
                className="px-2 py-1 rounded border"
                disabled={busy}
                onClick={() => start(() => adminApproveClaimAction(c.id, slug))}
              >
                Approve
              </button>
              <button
                className="px-2 py-1 rounded border"
                disabled={busy}
                onClick={() => start(() => adminDenyClaimAction(c.id, slug))}
              >
                Deny
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
