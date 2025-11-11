"use client";

import Link from "next/link";

type PendingInvite = {
  invite_id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_username: string | null;
  athlete_profile_id: string | null;
  inviter_name: string | null;
  message: string | null;
  created_at: string;
  expires_at: string;
};

export default function PendingInvitesTable({
  invites,
  teamId,
}: {
  invites: PendingInvite[];
  teamId: string;
}) {
  function getDaysRemaining(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="rounded-xl border border-app bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-app">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Athlete
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Invited By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Sent
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Expires
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-app uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {invites.map((invite) => {
              const daysRemaining = getDaysRemaining(invite.expires_at);
              return (
                <tr key={invite.invite_id} className="hover:bg-muted/50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-app">{invite.athlete_name}</div>
                      {invite.athlete_username && (
                        <div className="text-xs text-muted">@{invite.athlete_username}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-app">{invite.inviter_name || "Unknown"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        daysRemaining <= 3 ? "text-red-600 font-medium" : "text-muted"
                      }`}
                    >
                      {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {invite.athlete_profile_id && (
                      <Link
                        href={`/athletes/${invite.athlete_profile_id}`}
                        className="text-sm font-medium text-scarlet hover:underline"
                        target="_blank"
                      >
                        View Profile →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
