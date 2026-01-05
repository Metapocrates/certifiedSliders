// src/app/(protected)/parent/help/page.tsx
import Link from 'next/link';

export default function ParentHelpPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-app">Parent Portal Help</h1>
        <p className="mt-1 text-sm text-muted">
          Frequently asked questions and support resources
        </p>
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
          The Parent Portal provides read-only access to your athletes&apos; verified results and progress.
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">How do I link to my athlete?</h2>
          <p className="mt-2 text-sm text-muted">
            Go to your <Link href="/parent/onboarding" className="text-scarlet underline">onboarding page</Link> or dashboard to search for your athlete and send a link request. They&apos;ll receive a notification and can accept the connection from their profile.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">How do I view my athlete&apos;s results?</h2>
          <p className="mt-2 text-sm text-muted">
            Once linked to your athlete, you can view their verified results on the <Link href="/parent/activity" className="text-scarlet underline">Activity</Link> page. You&apos;ll see all their verified performances and can click through to their full profile.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">Can my athlete submit their own results?</h2>
          <p className="mt-2 text-sm text-muted">
            Yes! Athletes can submit results directly from their own profile. Results go through our verification process where admins review the proof and either approve or reject the submission.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">Can I manage multiple athletes?</h2>
          <p className="mt-2 text-sm text-muted">
            Yes! You can link to multiple athletes and view results for all of them. Each athlete must accept your link request from their profile.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">Need more help?</h2>
          <p className="mt-2 text-sm text-muted">
            Contact us at <a href="mailto:support@certifiedsliders.com" className="text-scarlet underline">support@certifiedsliders.com</a> or visit our main <Link href="/help" className="text-scarlet underline">help center</Link>.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Link
          href="/parent/dashboard"
          className="inline-flex items-center text-sm font-semibold text-purple-600 hover:underline dark:text-purple-400"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
