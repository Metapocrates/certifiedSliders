// src/app/(protected)/parent/submissions/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/compat';
import EmptyState from '@/components/portals/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Submission = {
  id: number;
  athlete_id: string;
  event: string;
  mark: string;
  meet_name: string;
  meet_date: string;
  season: string;
  status: string;
  proof_url: string | null;
  timing: string | null;
  wind: number | null;
  confidence: number | null;
  created_at: string;
  athlete: {
    full_name: string | null;
    username: string | null;
    profile_id: string | null;
  };
};

function getStatusBadge(status: string) {
  const badges: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    },
    manual_review: {
      label: 'Manual Review',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    },
    verified: {
      label: 'Verified',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700',
    },
    approved: {
      label: 'Approved',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
    },
    imported: {
      label: 'Imported',
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    },
  };

  const config = badges[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300 dark:border-gray-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default async function ParentSubmissionsPage() {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/submissions');
  }

  // Fetch submissions created by this parent
  const { data: submissions } = await supabase
    .from('results')
    .select(`
      id,
      athlete_id,
      event,
      mark,
      meet_name,
      meet_date,
      season,
      status,
      proof_url,
      timing,
      wind,
      confidence,
      created_at,
      athlete:profiles!athlete_id(
        full_name,
        username,
        profile_id
      )
    `)
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false });

  const results = (submissions ?? []) as unknown as Submission[];

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app">My Submissions</h1>
          <p className="mt-1 text-sm text-muted">
            Track results you&apos;ve submitted on behalf of your athletes
          </p>
        </div>
        <Link
          href="/parent/submissions/new"
          className="rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
        >
          Submit New Result
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-app bg-card p-8">
          <EmptyState
            icon={
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            title="No submissions yet"
            description="Submit your first result to track your athlete's progress"
            action={{
              label: 'Submit Result',
              href: '/parent/submissions/new'
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-app bg-card p-4">
              <p className="text-xs text-muted">Total Submitted</p>
              <p className="mt-1 text-2xl font-semibold text-app">{results.length}</p>
            </div>
            <div className="rounded-lg border border-app bg-card p-4">
              <p className="text-xs text-muted">Verified</p>
              <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                {results.filter(r => r.status === 'verified').length}
              </p>
            </div>
            <div className="rounded-lg border border-app bg-card p-4">
              <p className="text-xs text-muted">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                {results.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="rounded-lg border border-app bg-card p-4">
              <p className="text-xs text-muted">In Review</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {results.filter(r => r.status === 'manual_review').length}
              </p>
            </div>
          </div>

          {/* Submissions table */}
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
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Proof
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {results.map((submission) => {
                    const athleteName =
                      submission.athlete?.full_name ||
                      submission.athlete?.username ||
                      submission.athlete?.profile_id ||
                      'Unknown';

                    const meetDate = new Date(submission.meet_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    const submittedDate = new Date(submission.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr key={submission.id} className="hover:bg-muted/20 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-app">{athleteName}</div>
                          {submission.athlete?.profile_id && (
                            <div className="text-xs text-muted">{submission.athlete.profile_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-app">{submission.event}</div>
                          <div className="text-xs text-muted">{submission.season}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-app">{submission.mark}</div>
                          {submission.timing && (
                            <div className="text-xs text-muted">{submission.timing}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-app max-w-xs truncate">{submission.meet_name}</div>
                          <div className="text-xs text-muted">{meetDate}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted">
                          {submittedDate}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {submission.proof_url ? (
                            <a
                              href={submission.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-scarlet hover:text-scarlet/80 underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status legend */}
          <div className="rounded-lg border border-app bg-card p-4">
            <h3 className="text-sm font-medium text-app mb-3">Status Legend</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2">
                {getStatusBadge('pending')}
                <span className="text-muted">Awaiting admin verification</span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge('manual_review')}
                <span className="text-muted">Edited data requires manual review</span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge('verified')}
                <span className="text-muted">Verified and approved by admin</span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge('approved')}
                <span className="text-muted">Approved by admin</span>
              </div>
              <div className="flex items-start gap-2">
                {getStatusBadge('rejected')}
                <span className="text-muted">Rejected by admin</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
