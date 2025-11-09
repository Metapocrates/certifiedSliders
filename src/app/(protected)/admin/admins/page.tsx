'use client';

import { useEffect, useState } from 'react';

interface Admin {
  user_id: string;
  granted_at: string;
  notes: string | null;
  granted_by: string | null;
  profiles: {
    full_name: string;
    email: string;
    username: string | null;
  } | null;
  granter: {
    full_name: string;
    email: string;
  } | null;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/admins');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch admins');
      }

      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      setError(error instanceof Error ? error.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAdding(true);

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), notes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant admin access');
      }

      setSuccess(`Admin access granted to ${data.admin.email}`);
      setEmail('');
      setNotes('');
      await fetchAdmins();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to grant admin access');
    } finally {
      setAdding(false);
    }
  }

  async function handleRevokeAdmin(userId: string, name: string) {
    if (!confirm(`Are you sure you want to revoke admin access from ${name}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/admins/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke admin access');
      }

      setSuccess(`Admin access revoked from ${name}`);
      await fetchAdmins();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke admin access');
    }
  }

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app">Admin Management</h1>
        <p className="mt-2 text-sm text-muted">
          Grant and revoke admin console access
        </p>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Success</p>
          <p className="mt-1">{success}</p>
        </div>
      )}

      {/* Grant Admin Form */}
      <div className="mb-8 rounded-xl border border-app bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-app">Grant Admin Access</h2>
        <form onSubmit={handleGrantAdmin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-app">
              User Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
              required
              disabled={adding}
            />
            <p className="mt-1 text-xs text-muted">
              User must have an existing account (profile) in the system
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-app">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this user being granted admin access?"
              rows={2}
              className="mt-1 w-full rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
              disabled={adding}
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-scarlet px-6 py-2 font-semibold text-white transition hover:bg-scarlet/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? 'Granting Access...' : 'Grant Admin Access'}
          </button>
        </form>
      </div>

      {/* Admins List */}
      <div className="rounded-xl border border-app bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold text-app">Current Admins</h2>

        {loading && (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-app border-t-transparent" />
            <p className="mt-3 text-sm text-muted">Loading admins...</p>
          </div>
        )}

        {!loading && admins.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted">No admins found.</p>
          </div>
        )}

        {!loading && admins.length > 0 && (
          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.user_id}
                className="flex items-start justify-between rounded-lg border border-app/20 p-4"
              >
                <div className="flex-1">
                  <div className="font-semibold text-app">
                    {admin.profiles?.full_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted">
                    {admin.profiles?.email}
                    {admin.profiles?.username && (
                      <span className="ml-2">(@{admin.profiles.username})</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>
                      Granted {new Date(admin.granted_at).toLocaleDateString()}
                      {admin.granter && (
                        <span> by {admin.granter.full_name}</span>
                      )}
                    </p>
                    {admin.notes && (
                      <p className="italic">&ldquo;{admin.notes}&rdquo;</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleRevokeAdmin(
                      admin.user_id,
                      admin.profiles?.full_name || admin.profiles?.email || 'this user'
                    )
                  }
                  className="ml-4 rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
