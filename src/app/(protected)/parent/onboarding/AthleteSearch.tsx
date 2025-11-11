'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Athlete = {
  id: string;
  profile_id: string | null;
  full_name: string | null;
  username: string | null;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
};

export default function AthleteSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Athlete[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/athletes/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.athletes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (athleteId: string) => {
    setIsInviting(athleteId);
    setError(null);

    try {
      const response = await fetch('/api/parent/invite-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invitation failed');
      }

      // Success - redirect to dashboard
      alert('Invitation sent! The athlete will need to accept your request.');
      router.push('/parent/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation failed');
    } finally {
      setIsInviting(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search athlete by name or profile ID..."
          className="w-full rounded-lg border border-app px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={isSearching || query.trim().length < 2}
          className="w-full rounded-lg bg-scarlet px-4 py-3 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search Athletes'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-app">Search Results ({results.length})</h3>
          <div className="space-y-2">
            {results.map((athlete) => (
              <div
                key={athlete.id}
                className="flex items-center justify-between rounded-lg border border-app bg-card p-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-app">
                    {athlete.full_name || athlete.username || 'Unknown'}
                  </p>
                  {athlete.profile_id && (
                    <p className="text-xs text-muted">{athlete.profile_id}</p>
                  )}
                  {athlete.school_name && (
                    <p className="text-xs text-muted">
                      {athlete.school_name}
                      {athlete.school_state && `, ${athlete.school_state}`}
                      {athlete.class_year && ` • Class of ${athlete.class_year}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleInvite(athlete.id)}
                  disabled={isInviting !== null}
                  className="ml-4 rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50"
                >
                  {isInviting === athlete.id ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !isSearching && results.length === 0 && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center text-sm text-amber-900 dark:text-amber-200">
          No athletes found. Try a different search term.
        </div>
      )}
    </div>
  );
}
