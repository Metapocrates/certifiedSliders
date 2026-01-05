// src/app/(protected)/parent/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/compat';
import SafeLink from '@/components/SafeLink';
import AthleteSearch from './AthleteSearch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ParentOnboardingPage() {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/parent/onboarding');
  }

  // Check if already has parent links
  const { data: existingLinks } = await supabase
    .from('parent_links')
    .select('id, status')
    .eq('parent_user_id', user.id)
    .in('status', ['accepted', 'pending']);

  // If already has links, redirect to dashboard
  if (existingLinks && existingLinks.length > 0) {
    redirect('/parent/dashboard');
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-app">Link Your Athlete</h1>
        <p className="mt-2 text-muted">
          Connect with your athlete to view their verified results and track their progress
        </p>
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
          Parent Portal is read-only. Athletes manage their own profiles and submit results.
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-app bg-card p-8">
          <h2 className="text-xl font-semibold text-app">Find Your Athlete</h2>
          <p className="mt-2 text-sm text-muted">
            Search for your athlete by name or profile ID to send a link request
          </p>

          <div className="mt-6">
            <AthleteSearch />
          </div>
        </div>

        <div className="rounded-xl border border-app bg-card p-8">
          <h2 className="text-xl font-semibold text-app">Alternative: Have Your Athlete Add You</h2>
          <p className="mt-2 text-sm text-muted">
            Your athlete can also add you as a parent from their profile settings
          </p>
          <p className="mt-3 text-sm text-muted">
            Direct them to their <strong>Profile → Parent/Guardian Links</strong> section
          </p>
        </div>

        <div className="flex justify-between">
          <SafeLink
            href="/dashboard"
            className="rounded-lg border border-app px-6 py-2.5 text-sm font-semibold text-app hover:bg-muted"
          >
            ← Back
          </SafeLink>
          <SafeLink
            href="/parent/dashboard"
            className="rounded-lg border border-app px-6 py-2.5 text-sm font-semibold text-app hover:bg-muted"
          >
            Skip for now →
          </SafeLink>
        </div>
      </div>
    </div>
  );
}
