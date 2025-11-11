'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ParentInvitation = {
  id: string;
  parent_user_id: string;
  status: string;
  note: string | null;
  created_at: string;
  parent: {
    full_name: string | null;
  } | null;
};

type Props = {
  invitations: ParentInvitation[];
};

export default function ParentInvitations({ invitations }: Props) {
  const router = useRouter();
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = async (linkId: string, action: 'accept' | 'reject') => {
    setResponding(linkId);
    setError(null);

    try {
      const response = await fetch('/api/parent/respond-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, action })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} invitation`);
      }

      // Refresh the page to show updated state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} invitation`);
      setResponding(null);
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-app">Parent/Guardian Requests</h3>
        <span className="rounded-full bg-scarlet px-2.5 py-0.5 text-xs font-semibold text-white">
          {invitations.length}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-lg border border-app bg-card p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-app">
                  {invitation.parent?.full_name || 'Parent/Guardian'}
                </p>
                {invitation.note && (
                  <p className="mt-2 text-sm text-muted italic">
                    &ldquo;{invitation.note}&rdquo;
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  Requested {new Date(invitation.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => handleResponse(invitation.id, 'accept')}
                  disabled={responding !== null}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {responding === invitation.id ? 'Processing...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleResponse(invitation.id, 'reject')}
                  disabled={responding !== null}
                  className="rounded-lg border border-app bg-white px-3 py-1.5 text-sm font-semibold text-app transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-900">
          <strong>What this means:</strong> Accepting a parent/guardian link allows them to submit verified results on your behalf. You can revoke access at any time from your profile settings.
        </p>
      </div>
    </div>
  );
}
