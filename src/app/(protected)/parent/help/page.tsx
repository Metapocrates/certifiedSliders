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
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">How do I link to my athlete?</h2>
          <p className="mt-2 text-sm text-muted">
            Go to your <Link href="/parent/onboarding" className="text-scarlet underline">onboarding page</Link> or dashboard to search for your athlete and send a link request. They'll receive a notification and can accept the connection from their profile.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">How do I submit results?</h2>
          <p className="mt-2 text-sm text-muted">
            Once linked to your athlete, you can submit results on their behalf from the <Link href="/parent/submissions/new" className="text-scarlet underline">Submit Result</Link> page. You'll need proof (Athletic.net link, meet results, etc.) for verification.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">What happens after I submit a result?</h2>
          <p className="mt-2 text-sm text-muted">
            Submitted results go through our verification process. Admins review the proof and either approve or reject the submission. You'll be able to track the status in your <Link href="/parent/submissions" className="text-scarlet underline">submissions list</Link>.
          </p>
        </section>

        <section className="rounded-xl border border-app bg-card p-6">
          <h2 className="text-lg font-semibold text-app">Can I manage multiple athletes?</h2>
          <p className="mt-2 text-sm text-muted">
            Yes! You can link to multiple athletes and submit results for all of them. Each athlete must accept your link request.
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
          className="inline-flex items-center text-sm font-semibold text-app hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
