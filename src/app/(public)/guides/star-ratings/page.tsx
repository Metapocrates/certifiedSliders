import Link from "next/link";

export const metadata = {
  title: "Star Ratings Explained - Certified Sliders",
  description: "Understand how star ratings work, what they mean for your grade level, and how to improve your rating.",
};

export default function StarRatingsGuide() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/guides" className="text-sm text-scarlet hover:underline">
          ← Back to guides
        </Link>
      </div>

      <article className="prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-app">Star Ratings Explained</h1>
        <p className="text-lg text-muted">
          Learn how star ratings work, what they mean for your grade level, and how performance standards differ
          by academic year.
        </p>

        <div className="mt-8 rounded-2xl border border-app bg-card p-6 shadow-sm">
          <h2 className="mt-0 text-xl font-semibold text-app">What are Star Ratings?</h2>
          <p className="mb-0 text-sm text-muted">
            Star ratings (1-5★) provide a standardized way to evaluate track & field performances relative to
            national standards for your <strong>specific grade level and gender</strong>. A 5★ performance
            represents elite-level achievement for that grade, while 1★ represents solid varsity-level performance.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">The Star Rating Scale</h2>
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐⭐⭐⭐⭐</span>
              <h3 className="text-lg font-bold text-yellow-900">5-Star: Elite</h3>
            </div>
            <p className="mt-2 mb-0 text-sm text-yellow-900">
              National championship caliber. Top 1-2% of athletes in the country for your grade level. College
              recruiters are watching.
            </p>
          </div>

          <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐⭐⭐⭐</span>
              <h3 className="text-lg font-bold text-blue-900">4-Star: Excellent</h3>
            </div>
            <p className="mt-2 mb-0 text-sm text-blue-900">
              State championship contender. Top 5-10% nationally. Strong college recruiting potential.
            </p>
          </div>

          <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐⭐⭐</span>
              <h3 className="text-lg font-bold text-green-900">3-Star: Very Good</h3>
            </div>
            <p className="mt-2 mb-0 text-sm text-green-900">
              Regional qualifier level. Top 20-25% nationally. On the radar for college programs.
            </p>
          </div>

          <div className="rounded-xl border-2 border-purple-400 bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐⭐</span>
              <h3 className="text-lg font-bold text-purple-900">2-Star: Good</h3>
            </div>
            <p className="mt-2 mb-0 text-sm text-purple-900">
              Solid varsity level. League/district competitor. Room to grow into recruitment.
            </p>
          </div>

          <div className="rounded-xl border-2 border-gray-400 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <h3 className="text-lg font-bold text-gray-900">1-Star: Varsity</h3>
            </div>
            <p className="mt-2 mb-0 text-sm text-gray-900">
              Varsity qualifying level. Good foundation to build on. Potential to move up with training.
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Grade-Level Context is Key</h2>
        <p>
          <strong className="text-scarlet">The same performance can have different star ratings depending on your grade level.</strong>
        </p>

        <div className="my-6 rounded-lg bg-gray-50 border p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Example: Boys 100m at 10.95 seconds</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span><strong>Freshman (Grade 9):</strong></span>
              <span className="font-semibold text-yellow-600">⭐⭐⭐⭐⭐ 5-Star (Elite!)</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Sophomore (Grade 10):</strong></span>
              <span className="font-semibold text-blue-600">⭐⭐⭐⭐ 4-Star (Excellent)</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Junior (Grade 11):</strong></span>
              <span className="font-semibold text-green-600">⭐⭐⭐ 3-Star (Very Good)</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Senior (Grade 12):</strong></span>
              <span className="font-semibold text-purple-600">⭐⭐ 2-Star (Good)</span>
            </div>
          </div>
          <p className="mt-3 mb-0 text-xs text-gray-600 italic">
            This is why we assign ratings by grade level - to fairly compare athletes against their peers.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">How Ratings are Assigned</h2>
        <ol className="space-y-3">
          <li>
            <strong>Your performance is recorded</strong> with the exact date and your class year
          </li>
          <li>
            <strong>We calculate your grade</strong> at the time of the performance
            <ul className="mt-2 space-y-1">
              <li>School year boundaries: August 1st (not calendar year)</li>
              <li>Example: July 31, 2026 for a Class of 2028 athlete = Sophomore year</li>
              <li>Example: August 1, 2026 for a Class of 2028 athlete = Junior year</li>
            </ul>
          </li>
          <li>
            <strong>We compare to national standards</strong> for your grade, gender, and event
          </li>
          <li>
            <strong>A star rating is assigned</strong> based on where your performance falls
          </li>
        </ol>

        <div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="mb-0 text-sm text-blue-900">
            <strong>💡 Important:</strong> Star ratings are assigned based on the grade you were in when you
            achieved the performance, not your current grade. Your historical results keep their original ratings.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">FAT vs. Hand Timing</h2>
        <p>
          Timing method affects star ratings for sprint events (100m, 200m, 400m):
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">FAT (Fully Automatic Timing)</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>Electronic sensors at start/finish</li>
              <li>Accurate to 0.01 seconds</li>
              <li><strong>Used as-is for star ratings</strong></li>
              <li>Preferred by college recruiters and record books</li>
            </ul>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Hand Timing</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>Stopwatch timing by humans</li>
              <li>Less precise, reaction time bias</li>
              <li><strong>Converted: +0.24 seconds added for sprints</strong></li>
              <li>Example: 10.7h (hand) → 10.94 (adjusted) for star rating calculation</li>
            </ul>
          </div>
        </div>

        <div className="my-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="mb-0 text-sm text-amber-900">
            <strong>⚠️ Note:</strong> Hand times are accepted but will be marked as such. For the most accurate
            star ratings and college recruiting profile, aim to compete at meets with FAT timing.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Wind Readings & Legality</h2>
        <p>
          For sprints (100m, 200m) and horizontal jumps (LJ, TJ), wind conditions matter:
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Wind Legal:</strong> Wind assistance ≤ +2.0 m/s
            <ul className="mt-1 space-y-1 ml-4">
              <li>Counts for official records and standard star ratings</li>
              <li>Marked with wind reading (e.g., +1.5 m/s)</li>
            </ul>
          </li>
          <li>
            <strong>Wind Illegal (IL):</strong> Wind assistance &gt; +2.0 m/s
            <ul className="mt-1 space-y-1 ml-4">
              <li>Still tracked and displayed, but marked as (IL)</li>
              <li>May affect star rating calculation</li>
              <li>Not eligible for official records</li>
            </ul>
          </li>
          <li>
            <strong>No Wind Info (NWI):</strong> Wind reading not available
            <ul className="mt-1 space-y-1 ml-4">
              <li>Treated as wind legal for star rating purposes</li>
              <li>Common at smaller meets</li>
            </ul>
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold text-app">How to Improve Your Star Rating</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">1. Compete Often</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              More competitions mean more chances to PR and improve your rating. Target 8-12 competitions per season.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">2. Choose the Right Events</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Focus on events where you have natural talent. It&apos;s better to be 4★ in two events than 2★ in five.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">3. Compete at Quality Meets</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Meets with FAT timing, wind gauges, and strong competition help you achieve your best verified marks.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">4. Peak at the Right Time</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Early season times are good for building confidence, but championship meets are where star ratings
              jump. Train smart to peak for regionals, state, and nationals.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">5. Update Your Profile Regularly</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              <Link href="/guides/submit-result" className="text-scarlet underline">Submit results</Link> promptly
              after each meet. Keep your profile fresh for coaches and recruiters.
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Star Ratings & College Recruiting</h2>
        <p>
          College coaches use star ratings as a quick assessment tool, but they&apos;re not the only factor:
        </p>
        <ul className="space-y-2">
          <li>
            <strong>4-5★ athletes:</strong> Actively recruited by D1 programs
          </li>
          <li>
            <strong>3★ athletes:</strong> Strong candidates for D2/D3 and smaller D1 programs
          </li>
          <li>
            <strong>2★ athletes:</strong> Potential for D2/D3/NAIA with continued development
          </li>
          <li>
            <strong>1★ athletes:</strong> Walk-on potential, especially at smaller schools
          </li>
        </ul>

        <div className="my-6 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
          <p className="mb-0 text-sm text-green-900">
            <strong>✓ Remember:</strong> Coaches also consider GPA, character, work ethic, injury history,
            and trajectory (improving vs. plateauing). A 3★ athlete with upward momentum may be more valuable
            than a 4★ athlete who&apos;s peaked.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Why Ratings Change</h2>
        <p>Your current star rating may change over time for several reasons:</p>
        <ul className="space-y-2">
          <li>
            <strong>New PR:</strong> You achieve a better mark, earning a higher rating
          </li>
          <li>
            <strong>Grade advancement:</strong> Standards increase as you move from Freshman → Senior
          </li>
          <li>
            <strong>Updated standards:</strong> We periodically update national benchmarks based on current data
          </li>
        </ul>

        <div className="my-6 rounded-lg bg-gray-50 border p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Example scenario:</p>
          <p className="text-sm text-gray-700 mb-0">
            You run 10.95 as a Freshman (⭐⭐⭐⭐⭐). As a Senior, if 10.95 is still your PR, your rating
            drops to ⭐⭐ because the standards are higher for seniors. However, your Freshman result still
            shows as ⭐⭐⭐⭐⭐ in your history to reflect that exceptional achievement.
          </p>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Common Questions</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Can I have different ratings for different events?</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Yes! Each event has its own rating. You might be 5★ in 100m but 3★ in 400m.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Do star ratings differ for boys and girls?</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Yes. Boys and girls have separate standards and are never directly compared. A 5★ girls performance
              and a 5★ boys performance both represent elite achievement within their respective categories.
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">What if I don&apos;t have a star rating?</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Not all performances earn star ratings. The thresholds represent varsity-level and above. Keep
              training and competing - your first star is within reach!
            </p>
          </div>

          <div className="rounded-xl border border-app bg-card p-4">
            <h3 className="text-lg font-semibold text-app">Are indoor and outdoor rated the same?</h3>
            <p className="mt-2 mb-0 text-sm text-muted">
              Generally yes, though some events (like 300m indoor vs 400m outdoor) may have different standards.
              Indoor times are often slightly faster for distance events due to ideal conditions.
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-semibold text-app">Learn More</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/guides/submit-result"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">Submit a Result</h3>
            <p className="mt-1 text-sm text-muted">
              Add performances to your profile to get star ratings
            </p>
          </Link>
          <Link
            href="/rankings"
            className="rounded-xl border border-app bg-card p-4 transition hover:border-scarlet hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-app">View Rankings</h3>
            <p className="mt-1 text-sm text-muted">
              See where you rank among your peers nationally
            </p>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-app bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-app">Still have questions?</h2>
          <p className="mt-2 mb-0 text-sm text-muted">
            Check our <Link href="/faq" className="text-scarlet underline">FAQ page</Link> or contact support
            for more information about star ratings and how they&apos;re calculated.
          </p>
        </div>
      </article>
    </div>
  );
}
