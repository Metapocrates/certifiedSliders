// src/app/(protected)/parent/dashboard/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/compat';
import EmptyState from '@/components/portals/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LinkedAthlete = {
  id: string;
  athlete_id: string;
  athlete_name: string | null;
  athlete_profile_id: string | null;
  athlete_school: string | null;
  athlete_class_year: number | null;
  status: string;
  created_at: string;
};

export default async function ParentDashboardPage() {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/dashboard');
  }

  // Get linked athletes
  const { data: links } = await supabase
    .from('parent_links')
    .select(`
      id,
      athlete_id,
      status,
      created_at,
      athlete:profiles!athlete_id (
        full_name,
        profile_id,
        school_name,
        class_year
      )
    `)
    .eq('parent_user_id', user.id)
    .order('created_at', { ascending: false });

  const linkedAthletes: LinkedAthlete[] = (links ?? []).map((link: any) => ({
    id: link.id,
    athlete_id: link.athlete_id,
    athlete_name: link.athlete?.full_name || null,
    athlete_profile_id: link.athlete?.profile_id || null,
    athlete_school: link.athlete?.school_name || null,
    athlete_class_year: link.athlete?.class_year || null,
    status: link.status,
    created_at: link.created_at
  }));

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app">Parent Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Manage athlete connections and submit results
          </p>
        </div>
        <Link
          href="/parent/submissions/new"
          className="rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
        >
          Submit Result
        </Link>
      </div>

      {/* Linked Athletes */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-app">Linked Athletes</h2>

        {linkedAthletes.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="No linked athletes yet"
            description="Search for your athlete and send a link request to get started"
            action={{
              label: 'Find Athlete',
              href: '/parent/onboarding'
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {linkedAthletes.map((athlete) => (
              <div
                key={athlete.id}
                className="overflow-hidden rounded-xl border border-app bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-app">
                      {athlete.athlete_name || 'Unknown Athlete'}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${
                        athlete.status === 'accepted'
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : athlete.status === 'pending'
                          ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {athlete.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-muted">
                    {athlete.athlete_profile_id && (
                      <p>Profile: {athlete.athlete_profile_id}</p>
                    )}
                    {athlete.athlete_school && <p>{athlete.athlete_school}</p>}
                    {athlete.athlete_class_year && <p>Class of {athlete.athlete_class_year}</p>}
                  </div>

                  {athlete.athlete_profile_id && athlete.status === 'accepted' && (
                    <Link
                      href={`/athletes/${athlete.athlete_profile_id}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-scarlet hover:underline"
                    >
                      View Profile →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-app">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/parent/submissions/new"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <h3 className="font-semibold text-app">Submit Result</h3>
            <p className="mt-1 text-sm text-muted">Add a new PR for your athlete</p>
          </Link>

          <Link
            href="/parent/submissions"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="font-semibold text-app">View Submissions</h3>
            <p className="mt-1 text-sm text-muted">Track your submitted results</p>
          </Link>

          <Link
            href="/parent/help"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-app">Help & Support</h3>
            <p className="mt-1 text-sm text-muted">Get answers to common questions</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
