// src/app/(protected)/parent/activity/page.tsx
// Parent activity feed - shows verified results for linked athletes (read-only)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/compat';
import EmptyState from '@/components/portals/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type VerifiedResult = {
  id: number;
  event: string;
  mark: string;
  meet_name: string;
  meet_date: string;
  season: string;
  timing: string | null;
  wind: number | null;
  verified_at: string | null;
  athlete: {
    id: string;
    full_name: string | null;
    username: string | null;
    profile_id: string | null;
  };
};

export default async function ParentActivityPage() {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/activity');
  }

  // Get linked athlete IDs (only accepted links)
  const { data: links } = await supabase
    .from('parent_links')
    .select('athlete_id')
    .eq('parent_user_id', user.id)
    .eq('status', 'accepted');

  const athleteIds = (links ?? []).map(l => l.athlete_id);

  // Fetch verified results for linked athletes
  let results: VerifiedResult[] = [];

  if (athleteIds.length > 0) {
    const { data: verifiedResults } = await supabase
      .from('results')
      .select(`
        id,
        event,
        mark,
        meet_name,
        meet_date,
        season,
        timing,
        wind,
        verified_at,
        athlete:profiles!athlete_id(
          id,
          full_name,
          username,
          profile_id
        )
      `)
      .in('athlete_id', athleteIds)
      .in('status', ['verified', 'approved', 'imported'])
      .order('meet_date', { ascending: false })
      .limit(50);

    results = (verifiedResults ?? []) as unknown as VerifiedResult[];
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app">Athlete Activity</h1>
            <p className="mt-1 text-sm text-muted">
              Recent verified results from your linked athletes
            </p>
          </div>
          <Link
            href="/parent/dashboard"
            className="text-sm text-purple-600 hover:underline dark:text-purple-400"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
          You are viewing a read-only parent view. Results are submitted and managed by athletes.
        </div>
      </div>

      {athleteIds.length === 0 ? (
        <div className="rounded-xl border border-app bg-card p-8">
          <EmptyState
            icon={
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No linked athletes"
            description="Link with an athlete to see their verified results"
            action={{
              label: 'Find Athlete',
              href: '/parent/onboarding'
            }}
          />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-app bg-card p-8">
          <EmptyState
            icon={
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="No verified results yet"
            description="Results will appear here once your athletes have verified performances"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results list */}
          <div className="rounded-xl border border-app bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-app bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Athlete
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Mark
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Meet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {results.map((result) => {
                    const athleteName =
                      result.athlete?.full_name ||
                      result.athlete?.username ||
                      result.athlete?.profile_id ||
                      'Unknown';

                    const meetDate = new Date(result.meet_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr key={result.id} className="hover:bg-muted/20 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-app">{athleteName}</div>
                            {result.athlete?.profile_id && (
                              <Link
                                href={`/athletes/${result.athlete.profile_id}`}
                                className="text-xs text-scarlet hover:underline"
                              >
                                View Profile
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-app">{result.event}</div>
                          <div className="text-xs text-muted">{result.season}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-app">{result.mark}</div>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            {result.timing && <span>{result.timing}</span>}
                            {result.wind !== null && <span>Wind: {result.wind}m/s</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-app max-w-xs truncate">{result.meet_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted">
                          {meetDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-muted">
            Showing the most recent 50 verified results
          </p>
        </div>
      )}
    </div>
  );
}
