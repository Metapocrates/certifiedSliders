import Link from "next/link";

export const metadata = {
  title: "Verify Your Athletic.net Profile - Certified Sliders",
  description: "Step-by-step guide to linking and verifying your Athletic.net profile for automatic result imports.",
};

export default function VerifyProfileGuide() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/guides" className="text-sm text-scarlet hover:underline">
          ← Back to guides
        </Link>
      </div>

      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-app">Verify Your Athletic.net Profile</h1>
        <p className="text-lg text-muted">
          Link your Athletic.net account to automatically import verified results and unlock additional features.
        </p>

        <div className="mt-8 rounded-2xl border border-green-300 bg-green-50 p-6">
          <h2 className="mt-0 text-xl font-semibold text-green-900">Benefits of Verification</h2>
          <ul className="mb-0 space-y-2 text-sm text-green-800">
            <li>✓ Automatic import of all your Athletic.net results</li>
            <li>✓ Verified badge on your profile</li>
            <li>✓ Higher trust from coaches and recruiters</li>
            <li>✓ Faster result submission (no manual entry needed)</li>
            <li>✓ Automatic updates when new results are posted</li>
          </ul>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Prerequisites</h2>
        <ul className="space-y-2">
          <li>A claimed Certified Sliders profile with your real name</li>
          <li>An existing Athletic.net profile with results</li>
          <li>Access to update your Athletic.net profile bio</li>
        </ul>

        <div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="mb-0 text-sm text-blue-900">
            <strong>💡 Important:</strong> Your name on Certified Sliders must match your name on Athletic.net
            for verification to work properly.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 1: Start the Verification Process</h2>
        <ol className="space-y-3">
          <li>Log in to your Certified Sliders account</li>
          <li>
            Navigate to <strong>Settings</strong> (click your profile icon in the top right)
          </li>
          <li>Scroll to the <strong>Athletic.net Integration</strong> section</li>
          <li>Click the <strong>Link Athletic.net Profile</strong> button</li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 2: Find Your Athletic.net Profile URL</h2>
        <p>You&apos;ll need your Athletic.net profile URL. Here&apos;s how to find it:</p>
        <ol className="space-y-3">
          <li>
            Go to{" "}
            <a
              href="https://www.athletic.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-scarlet underline"
            >
              Athletic.net
            </a>
          </li>
          <li>Search for your name in the search bar</li>
          <li>Click on your profile in the search results</li>
          <li>
            Copy the URL from your browser&apos;s address bar
            <br />
            <span className="text-sm text-muted">
              (It should look like: <code>https://www.athletic.net/TrackAndField/Athlete.aspx?AID=XXXXX</code>)
            </span>
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 3: Generate Your Verification Code</h2>
        <ol className="space-y-3">
          <li>Paste your Athletic.net profile URL into the input field on Certified Sliders</li>
          <li>Click <strong>Generate Verification Code</strong></li>
          <li>
            You&apos;ll see a unique verification code (e.g., <code>CS-VERIFY-ABC123</code>)
          </li>
          <li>
            <strong>Copy this code</strong> - you&apos;ll need it for the next step
          </li>
        </ol>

        <div className="my-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="mb-0 text-sm text-amber-900">
            <strong>⚠️ Keep this page open!</strong> Don&apos;t close the verification page until you&apos;ve completed
            all steps.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 4: Add Code to Your Athletic.net Bio</h2>
        <p>Now you&apos;ll add the verification code to your Athletic.net profile bio:</p>
        <ol className="space-y-3">
          <li>
            Open a new tab and go to your Athletic.net profile (use the URL from Step 2)
          </li>
          <li>Click <strong>Edit Profile</strong> or <strong>Settings</strong></li>
          <li>Find the <strong>Bio</strong> or <strong>About Me</strong> section</li>
          <li>
            Paste your verification code (<code>CS-VERIFY-ABC123</code>) anywhere in your bio
            <ul className="mt-2 space-y-1">
              <li>You can add it at the beginning, end, or anywhere in between</li>
              <li>It can be on its own line or mixed with other text</li>
              <li>The code must be exactly as shown (case-sensitive)</li>
            </ul>
          </li>
          <li>Click <strong>Save</strong> to update your Athletic.net profile</li>
        </ol>

        <div className="my-6 rounded-lg bg-gray-50 border p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Example Bio with Verification Code:</p>
          <pre className="text-xs bg-white border rounded p-3 overflow-x-auto">
            {`Class of 2027 • 400m/800m specialist
CS-VERIFY-ABC123
Running for State Championship 🏃‍♂️`}
          </pre>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 5: Complete Verification</h2>
        <ol className="space-y-3">
          <li>Return to the Certified Sliders verification page</li>
          <li>Click <strong>Verify Now</strong></li>
          <li>
            Wait a few seconds while we check your Athletic.net profile
            <ul className="mt-2 space-y-1">
              <li>We&apos;ll scan your bio for the verification code</li>
              <li>We&apos;ll confirm your name matches</li>
              <li>We&apos;ll validate your profile URL</li>
            </ul>
          </li>
          <li>
            If successful, you&apos;ll see a confirmation message and your profile will be marked as verified!
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">After Verification</h2>
        <p>Once your profile is verified:</p>
        <ul className="space-y-2">
          <li>
            <strong>Remove the verification code</strong> from your Athletic.net bio (it&apos;s no longer needed)
          </li>
          <li>Your Athletic.net results will automatically import within 24 hours</li>
          <li>Future results on Athletic.net will sync automatically</li>
          <li>A verified badge will appear on your Certified Sliders profile</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold text-app">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Verification Failed - Code Not Found</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>Double-check that you copied the code exactly (including dashes)</li>
              <li>Make sure you saved your Athletic.net profile after adding the code</li>
              <li>Wait a minute and try verifying again (Athletic.net may need time to update)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Name Mismatch Error</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>Your name on Certified Sliders must match your Athletic.net name</li>
              <li>Update your name in Settings to match exactly</li>
              <li>Try verification again after updating</li>
            </ul>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Invalid Profile URL</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>Make sure you&apos;re using your Athletic.net profile URL, not a meet results URL</li>
              <li>The URL should contain <code>Athlete.aspx?AID=</code></li>
              <li>Copy the URL directly from your browser&apos;s address bar</li>
            </ul>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Can&apos;t Edit Athletic.net Profile</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>You may need to contact your coach or team administrator</li>
              <li>Some school profiles are managed by coaches and locked from athlete editing</li>
              <li>Ask your coach to add the verification code for you</li>
            </ul>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Need More Help?</h2>
        <p>
          If you&apos;re still having trouble verifying your profile, check our{" "}
          <Link href="/faq" className="text-scarlet underline">
            FAQ page
          </Link>{" "}
          or contact support for personalized assistance. Include your Certified Sliders profile URL and Athletic.net
          profile URL in your message.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/guides/submit-result"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Next: Submit a Result</h3>
            <p className="mt-1 text-sm text-muted">
              Learn how to manually submit results if you need to add performances
            </p>
          </Link>
          <Link
            href="/faq"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">FAQ</h3>
            <p className="mt-1 text-sm text-muted">Browse frequently asked questions about verification</p>
          </Link>
        </div>
      </article>
    </div>
  );
}
