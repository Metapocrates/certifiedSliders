import Link from "next/link";

export const metadata = {
  title: "How to Submit a Result - Certified Sliders",
  description: "Step-by-step guide to manually submitting track & field results with proof links.",
};

export default function SubmitResultGuide() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/guides" className="text-sm text-scarlet hover:underline">
          ← Back to guides
        </Link>
      </div>

      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-app">How to Submit a Result</h1>
        <p className="text-lg text-muted">
          Learn how to manually submit track & field performances, add proof links, and get your results verified.
        </p>

        <div className="mt-8 rounded-2xl border border-app bg-card p-6 shadow-sm">
          <h2 className="mt-0 text-xl font-semibold text-app">Before You Start</h2>
          <p className="mb-0 text-sm text-muted">
            If you have an{" "}
            <Link href="/guides/verify-profile" className="text-scarlet underline">
              Athletic.net verified profile
            </Link>
            , most results will import automatically. Manual submission is for:
          </p>
          <ul className="mb-0 mt-2 space-y-1 text-sm text-muted">
            <li>Results not yet on Athletic.net</li>
            <li>MileSplit-only results</li>
            <li>Recent performances waiting to be posted</li>
            <li>Results from smaller or unaffiliated meets</li>
          </ul>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">What You&apos;ll Need</h2>
        <ul className="space-y-2">
          <li>
            <strong>Performance details:</strong> Event, mark/time, date
          </li>
          <li>
            <strong>Meet information:</strong> Name, location, date
          </li>
          <li>
            <strong>Proof link:</strong> Athletic.net, MileSplit, or official meet results URL
          </li>
          <li>
            <strong>Additional info (if applicable):</strong> Wind reading, timing method (FAT/hand), season (indoor/outdoor)
          </li>
        </ul>

        <div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="mb-0 text-sm text-blue-900">
            <strong>💡 Pro tip:</strong> Have your proof link ready before starting. This makes the submission
            process much faster and increases approval chances.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 1: Navigate to Submit Result</h2>
        <ol className="space-y-3">
          <li>Log in to your Certified Sliders account</li>
          <li>Go to your profile page (click your name/profile icon)</li>
          <li>
            Click the <strong>Submit Result</strong> button
            <br />
            <span className="text-sm text-muted">(Usually found near the top of your profile)</span>
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 2: Select Event</h2>
        <ol className="space-y-3">
          <li>
            Choose your event from the dropdown menu:
            <ul className="mt-2 space-y-1">
              <li><strong>Sprints:</strong> 100m, 200m, 400m</li>
              <li><strong>Distance:</strong> 800m, 1600m, 1 Mile, 3200m, 2 Mile, 5000m</li>
              <li><strong>Hurdles:</strong> 110H, 100H, 300H, 400H</li>
              <li><strong>Jumps:</strong> Long Jump (LJ), Triple Jump (TJ), High Jump (HJ), Pole Vault (PV)</li>
              <li><strong>Throws:</strong> Shot Put (SP), Discus (DT), Javelin (JT), Weight Throw (WT)</li>
            </ul>
          </li>
          <li>Can&apos;t find your event? Contact support to request an addition</li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 3: Enter Your Mark/Time</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">For Running Events:</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Sprints (100m-400m):</strong> Enter in seconds (e.g., 10.95, 48.32)
              </li>
              <li>
                <strong>Middle/Long Distance:</strong> Enter as M:SS.SS (e.g., 1:55.23, 4:18.67)
              </li>
              <li>
                <strong>Timing method:</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li>FAT (Fully Automatic Timing) - electronic timing</li>
                  <li>Hand timing - stopwatch (will be converted with +0.24s for sprints)</li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">For Field Events:</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Horizontal Jumps (LJ, TJ):</strong> Enter in meters (e.g., 7.25) or feet-inches (e.g., 23-9.5)
              </li>
              <li>
                <strong>Vertical Jumps (HJ, PV):</strong> Enter in meters (e.g., 2.05) or feet-inches (e.g., 6-8.75)
              </li>
              <li>
                <strong>Throws (SP, DT, JT, WT):</strong> Enter in meters (e.g., 15.42) or feet-inches (e.g., 50-7)
              </li>
            </ul>
          </div>
        </div>

        <div className="my-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="mb-0 text-sm text-amber-900">
            <strong>⚠️ Important:</strong> Enter your mark exactly as it appears on the official results.
            Don&apos;t round or estimate.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 4: Add Wind Information (if applicable)</h2>
        <p>For 100m, 200m, and horizontal jumps, wind readings are important:</p>
        <ul className="space-y-2">
          <li>
            Enter wind in meters per second (e.g., +2.0, -1.5, 0.0)
          </li>
          <li>
            <strong>Wind legal:</strong> Wind assistance ≤ +2.0 m/s
          </li>
          <li>
            <strong>Wind illegal (IL):</strong> Wind assistance &gt; +2.0 m/s
          </li>
          <li>
            If no wind reading is available, leave blank (will be marked as NWI - No Wind Info)
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 5: Enter Meet Details</h2>
        <ol className="space-y-3">
          <li>
            <strong>Meet Name:</strong> Full official name (e.g., &quot;CIF State Championships&quot;)
          </li>
          <li>
            <strong>Meet Date:</strong> Date the performance was achieved
          </li>
          <li>
            <strong>Season:</strong> Indoor or Outdoor
            <ul className="mt-2 space-y-1">
              <li>Indoor: Typically Nov-Feb</li>
              <li>Outdoor: Typically Mar-Aug</li>
            </ul>
          </li>
          <li>
            <strong>Location</strong> (optional): City and state
          </li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 6: Add Proof Link</h2>
        <p className="font-semibold text-app">This is the most critical step for verification!</p>

        <div className="space-y-4 mt-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Acceptable Proof Sources:</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Athletic.net:</strong> Direct link to the meet results page showing your performance
              </li>
              <li>
                <strong>MileSplit:</strong> Article or results page with your performance
              </li>
              <li>
                <strong>Official results PDFs:</strong> Link to hosted PDF (via Google Drive, Dropbox, etc.)
              </li>
              <li>
                <strong>Meet director websites:</strong> Official results pages
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <h3 className="text-lg font-semibold text-red-900">NOT Acceptable:</h3>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              <li>❌ Social media posts without official results</li>
              <li>❌ Personal photos/screenshots only</li>
              <li>❌ &quot;Trust me&quot; or no proof</li>
              <li>❌ Broken or private links</li>
            </ul>
          </div>
        </div>

        <div className="my-6 rounded-lg bg-gray-50 border p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">How to get a good proof link:</p>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal ml-4">
            <li>Find your result on Athletic.net or MileSplit</li>
            <li>Copy the URL from your browser&apos;s address bar</li>
            <li>Test the link in a private/incognito window to ensure it&apos;s publicly accessible</li>
            <li>Paste it into the proof URL field</li>
          </ol>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Step 7: Review and Submit</h2>
        <ol className="space-y-3">
          <li>Double-check all information for accuracy</li>
          <li>Confirm your proof link is correct and accessible</li>
          <li>
            Click <strong>Submit Result</strong>
          </li>
          <li>You&apos;ll see a confirmation message that your result is pending verification</li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold text-app">What Happens Next?</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Verification Process:</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Pending:</strong> Your result is in the queue for review (typically 24-48 hours)
              </li>
              <li>
                <strong>Under Review:</strong> A moderator is checking your proof link and details
              </li>
              <li>
                <strong>Approved:</strong> Your result is verified and appears on your profile!
              </li>
              <li>
                <strong>Rejected:</strong> There was an issue (you&apos;ll receive feedback on why)
              </li>
            </ul>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Common Rejection Reasons</h2>
        <ul className="space-y-2">
          <li>
            <strong>Invalid proof link:</strong> Link is broken, private, or doesn&apos;t show the claimed performance
          </li>
          <li>
            <strong>Name mismatch:</strong> Name on proof doesn&apos;t match your profile name
          </li>
          <li>
            <strong>Incorrect details:</strong> Time/mark doesn&apos;t match proof, wrong date, wrong event
          </li>
          <li>
            <strong>Duplicate result:</strong> This performance was already submitted
          </li>
          <li>
            <strong>Insufficient proof:</strong> Social media post or screenshot without official results
          </li>
        </ul>

        <div className="my-6 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
          <p className="mb-0 text-sm text-green-900">
            <strong>✓ Best practices:</strong> Submit results as soon as they&apos;re posted online. Fresh results
            are easier to verify and less likely to have broken links.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Can&apos;t find proof link?</h3>
            <p className="mt-2 text-sm text-muted">
              Wait until the meet director posts results online. Most meets post results to Athletic.net within
              1-3 days. Check MileSplit for meet recaps that include results.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Result was rejected?</h3>
            <p className="mt-2 text-sm text-muted">
              Read the rejection feedback carefully. Fix the issue (usually updating the proof link or correcting
              details) and resubmit. Contact support if you need help.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Wrong grade/class year showing?</h3>
            <p className="mt-2 text-sm text-muted">
              Your grade is calculated automatically based on your class year and the meet date. If it&apos;s wrong,
              check that your class year is correct in Settings. Remember: the school year boundary is August 1st,
              not January 1st.
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Need Help?</h2>
        <p>
          If you&apos;re having trouble submitting a result, check our{" "}
          <Link href="/faq" className="text-scarlet underline">
            FAQ page
          </Link>{" "}
          or contact support with details about your issue.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/guides/verify-profile"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Verify Athletic.net</h3>
            <p className="mt-1 text-sm text-muted">
              Link your Athletic.net for automatic result imports
            </p>
          </Link>
          <Link
            href="/guides/star-ratings"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Star Ratings</h3>
            <p className="mt-1 text-sm text-muted">Learn how star ratings work and what they mean</p>
          </Link>
        </div>
      </article>
    </div>
  );
}
