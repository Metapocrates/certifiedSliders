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
  const supabase = await createSupabaseServer();

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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-app">Parent Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          View your linked athletes and track their progress
        </p>
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
          Welcome to the Parent Portal. This is a read-only view of your athletes&apos; verified results.
        </div>
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
            href="/parent/activity"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="font-semibold text-app">View Activity</h3>
            <p className="mt-1 text-sm text-muted">See your athletes' verified results</p>
          </Link>

          <Link
            href="/parent/onboarding"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h3 className="font-semibold text-app">Link Athlete</h3>
            <p className="mt-1 text-sm text-muted">Connect with another athlete</p>
          </Link>

          <Link
            href="/me/edit"
            className="group rounded-xl border border-app bg-card p-6 transition hover:border-scarlet hover:shadow-md"
          >
            <svg className="mb-3 h-8 w-8 text-scarlet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="font-semibold text-app">Edit Profile</h3>
            <p className="mt-1 text-sm text-muted">Update your profile picture and info</p>
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
