'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ProfileStatus = 'active' | 'archived' | 'deleted' | 'suspended';

interface Profile {
  id: string;
  profile_id: string | null;
  full_name: string;
  username: string | null;
  email: string;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
  gender: string | null;
  star_rating: number | null;
  status: ProfileStatus;
  status_changed_at: string | null;
  status_reason: string | null;
  created_at: string;
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProfileStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, [filter, search]);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/profiles?${params.toString()}`);
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(profileId: string, status: ProfileStatus) {
    const reason = prompt(`Reason for changing status to "${status}"?`);
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch('/api/admin/profiles/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, status, reason }),
      });

      if (response.ok) {
        await fetchProfiles();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Failed to update status');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const statusColors: Record<ProfileStatus, string> = {
    active: 'text-green-600 bg-green-50 border-green-200',
    archived: 'text-gray-600 bg-gray-50 border-gray-200',
    deleted: 'text-red-600 bg-red-50 border-red-200',
    suspended: 'text-orange-600 bg-orange-50 border-orange-200',
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app">Profile Management</h1>
        <p className="mt-2 text-sm text-muted">
          Manage athlete profile statuses (active, archived, deleted, suspended)
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="flex-1 rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-scarlet px-6 py-2 font-semibold text-white transition hover:bg-scarlet/90"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
              className="rounded-lg border border-app bg-card px-4 py-2 text-app transition hover:bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Status Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-app">
        {(['all', 'active', 'archived', 'suspended', 'deleted'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition ${
              filter === status
                ? 'border-b-2 border-scarlet text-scarlet'
                : 'text-muted hover:text-app'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-app border-t-transparent" />
          <p className="mt-3 text-sm text-muted">Loading profiles...</p>
        </div>
      )}

      {/* Profiles Table */}
      {!loading && profiles.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted">No profiles found for this filter.</p>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-app bg-muted/20">
                <th className="p-3 text-left text-sm font-semibold">Name</th>
                <th className="p-3 text-left text-sm font-semibold">Email</th>
                <th className="p-3 text-left text-sm font-semibold">School</th>
                <th className="p-3 text-left text-sm font-semibold">Class</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
                <th className="p-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-app/20 hover:bg-muted/10">
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-app">
                        {profile.full_name}
                        {profile.star_rating && profile.star_rating >= 3 && (
                          <span className="ml-2 text-xs">
                            {'⭐'.repeat(profile.star_rating)}
                          </span>
                        )}
                      </div>
                      {profile.username && (
                        <div className="text-xs text-muted">@{profile.username}</div>
                      )}
                      {profile.profile_id && (
                        <Link
                          href={`/athletes/${profile.profile_id}`}
                          target="_blank"
                          className="text-xs text-scarlet hover:underline"
                        >
                          View Profile →
                        </Link>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted">{profile.email}</td>
                  <td className="p-3 text-sm">
                    {profile.school_name && (
                      <div>
                        {profile.school_name}
                        {profile.school_state && `, ${profile.school_state}`}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-sm">{profile.class_year || '—'}</td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                          statusColors[profile.status]
                        }`}
                      >
                        {profile.status}
                      </span>
                      {profile.status_reason && (
                        <p className="text-xs text-muted" title={profile.status_reason}>
                          {profile.status_reason.slice(0, 30)}
                          {profile.status_reason.length > 30 && '...'}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {profile.status !== 'active' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'active')}
                          className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-green-700"
                        >
                          Activate
                        </button>
                      )}
                      {profile.status !== 'archived' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'archived')}
                          className="rounded bg-gray-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-gray-700"
                        >
                          Archive
                        </button>
                      )}
                      {profile.status !== 'suspended' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'suspended')}
                          className="rounded bg-orange-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-orange-700"
                        >
                          Suspend
                        </button>
                      )}
                      {profile.status !== 'deleted' && (
                        <button
                          onClick={() => updateStatus(profile.id, 'deleted')}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
