// src/app/(protected)/parent/submissions/new/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/compat';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewSubmissionPage() {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/submissions/new');
  }

  // Get linked athletes (accepted only)
  const { data: links } = await supabase
    .from('parent_links')
    .select(`
      athlete_id,
      athlete:profiles!athlete_id (
        full_name,
        profile_id
      )
    `)
    .eq('parent_user_id', user.id)
    .eq('status', 'accepted');

  const linkedAthletes = (links ?? []).map((link: any) => ({
    id: link.athlete_id,
    name: link.athlete?.full_name || 'Unknown',
    profile_id: link.athlete?.profile_id
  }));

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-app">Submit New Result</h1>
        <p className="mt-1 text-sm text-muted">
          Submit a verified performance on behalf of your athlete
        </p>
      </div>

      {linkedAthletes.length === 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900">No linked athletes found</h3>
          <p className="mt-2 text-sm text-amber-800">
            You need to link to an athlete before submitting results. Go to your dashboard to find and link to your athlete.
          </p>
          <Link
            href="/parent/dashboard"
            className="mt-4 inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-app bg-card p-8">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Coming Soon:</strong> Result submission form
            </p>
            <p className="mt-2 text-sm text-blue-800">
              For now, please use the existing <Link href="/submit-result" className="underline">result submission page</Link>
            </p>
          </div>

          {/* TODO: Add result submission form */}
          <div className="mt-6 space-y-4 opacity-50">
            <div>
              <label className="block text-sm font-medium text-app">Select Athlete</label>
              <select className="mt-1 w-full rounded-lg border border-app px-4 py-2" disabled>
                <option>Choose athlete...</option>
                {linkedAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name} ({athlete.profile_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app">Event</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-app px-4 py-2"
                placeholder="e.g., 100m"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app">Performance</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-app px-4 py-2"
                placeholder="e.g., 11.45"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app">Proof URL (Athletic.net, etc.)</label>
              <input
                type="url"
                className="mt-1 w-full rounded-lg border border-app px-4 py-2"
                placeholder="https://..."
                disabled
              />
            </div>

            <button
              className="w-full rounded-lg bg-scarlet px-4 py-3 text-sm font-semibold text-white"
              disabled
            >
              Submit for Verification
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/parent/dashboard"
          className="inline-flex items-center text-sm font-semibold text-app hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
