// src/app/(protected)/parent/submissions/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/compat';
import EmptyState from '@/components/portals/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ParentSubmissionsPage() {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/submissions');
  }

  // TODO: Get submissions created by this parent
  // For now, showing empty state

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
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

      <div className="rounded-xl border border-app bg-card p-4">
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

      {/* TODO: Add submissions table when ready */}
    </div>
  );
}
