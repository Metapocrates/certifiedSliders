import Link from "next/link";

export const metadata = {
  title: "How to Claim Your Profile - Certified Sliders",
  description: "Step-by-step guide to claiming your athlete profile on Certified Sliders.",
};

export default function ClaimProfileGuide() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/guides" className="text-sm text-scarlet hover:underline">
          ← Back to guides
        </Link>
      </div>

      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-app">How to Claim Your Profile</h1>
        <p className="text-lg text-muted">
          Learn how to create and claim your athlete profile to start building your verified track & field resume.
        </p>

        <div className="mt-8 rounded-2xl border border-app bg-card p-6 shadow-sm">
          <h2 className="mt-0 text-xl font-semibold text-app">What you&apos;ll need</h2>
          <ul className="mb-0 space-y-1 text-sm text-muted">
            <li>A valid email address</li>
            <li>Your school name and location</li>
            <li>Your graduation year (class year)</li>
            <li>Optional: Your Athletic.net profile URL</li>
          </ul>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 1: Create Your Account</h2>
        <ol className="space-y-3">
          <li>
            Navigate to the <Link href="/login" className="text-scarlet underline">sign up page</Link>
          </li>
          <li>Enter your email address and create a secure password</li>
          <li>Click <strong>Sign Up</strong> to create your account</li>
          <li>Check your email for a verification link and click it to verify your account</li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 2: Complete Your Profile</h2>
        <p>After verifying your email, you&apos;ll be prompted to complete your profile:</p>
        <ol className="space-y-3">
          <li>
            <strong>Basic Information</strong>
            <ul className="mt-2 space-y-1">
              <li>Full name (as it appears on Athletic.net or meet results)</li>
              <li>Username (this will be your unique profile URL)</li>
              <li>Gender (for appropriate rankings and star ratings)</li>
            </ul>
          </li>
          <li>
            <strong>School Information</strong>
            <ul className="mt-2 space-y-1">
              <li>School name</li>
              <li>City and state</li>
              <li>Class year (graduation year)</li>
            </ul>
          </li>
          <li>
            <strong>Profile Picture</strong> (optional but recommended)
            <ul className="mt-2 space-y-1">
              <li>Upload a clear photo of yourself</li>
              <li>This will appear on your public profile and in rankings</li>
            </ul>
          </li>
        </ol>

        <div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="mb-0 text-sm text-blue-900">
            <strong>💡 Pro tip:</strong> Use the same name format as your Athletic.net profile to make
            verification easier later.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 3: Link Your Athletic.net Profile</h2>
        <p>
          To automatically import your verified results from Athletic.net, you&apos;ll need to link your profile:
        </p>
        <ol className="space-y-3">
          <li>Go to your <strong>Settings</strong> page</li>
          <li>Find the <strong>Athletic.net Integration</strong> section</li>
          <li>Click <strong>Link Athletic.net Profile</strong></li>
          <li>
            Follow the detailed steps in our{" "}
            <Link href="/guides/verify-profile" className="text-scarlet underline">
              Athletic.net verification guide
            </Link>
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 4: Add Your Results</h2>
        <p>Once your profile is set up, you can start adding results:</p>
        <ol className="space-y-3">
          <li>
            <strong>Automatic Import</strong> (if Athletic.net verified):
            <ul className="mt-2 space-y-1">
              <li>Your verified Athletic.net results will automatically appear</li>
              <li>These results are marked with a verified badge</li>
            </ul>
          </li>
          <li>
            <strong>Manual Submission</strong>:
            <ul className="mt-2 space-y-1">
              <li>Click <strong>Submit Result</strong> from your profile</li>
              <li>Enter your performance details and proof link</li>
              <li>
                See our{" "}
                <Link href="/guides/submit-result" className="text-scarlet underline">
                  result submission guide
                </Link>{" "}
                for detailed instructions
              </li>
            </ul>
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Understanding Your Class Year & Grade</h2>
        <p>Your profile will display both your class year (graduation year) and your current grade level:</p>
        <ul className="space-y-2">
          <li>
            <strong>Class Year:</strong> The year you graduate (e.g., 2028)
          </li>
          <li>
            <strong>Grade Level:</strong> Automatically calculated based on the date (Freshman, Sophomore, Junior, Senior)
          </li>
          <li>
            <strong>Important:</strong> Academic years advance on August 1st each year, not January 1st
          </li>
        </ul>

        <div className="my-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="mb-0 text-sm text-amber-900">
            <strong>⚠️ Note:</strong> Your class year cannot be changed once it&apos;s locked (typically at the start of senior year).
            Make sure it&apos;s correct when you set up your profile!
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">What&apos;s Next?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/guides/verify-profile"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Verify Athletic.net</h3>
            <p className="mt-1 text-sm text-muted">
              Link your Athletic.net account for automatic result imports
            </p>
          </Link>
          <Link
            href="/guides/submit-result"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Submit a Result</h3>
            <p className="mt-1 text-sm text-muted">
              Learn how to manually add performances to your profile
            </p>
          </Link>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Need Help?</h2>
        <p>
          If you run into any issues claiming your profile, check our{" "}
          <Link href="/faq" className="text-scarlet underline">
            FAQ page
          </Link>{" "}
          or contact our support team for assistance.
        </p>
      </article>
    </div>
  );
}
