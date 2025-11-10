export const dynamic = "force-static";

export const metadata = {
  title: "Coaches Portal - Certified Sliders",
  description: "Verified athlete interest, star ratings, and results — no scraping, no spam. Connect with high school track & field athletes who are interested in your program.",
};

export default function CoachesLanding() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-app">Certified Sliders — Coaches Portal</h1>
        <p className="text-lg text-muted mt-4">
          Verified athlete interest, star ratings, and results — no scraping, no spam.
        </p>
        <div className="mt-6">
          <a
            href="/register?type=ncaa_coach"
            className="inline-flex rounded-xl px-5 py-3 bg-scarlet text-white font-semibold hover:bg-scarlet/90 transition"
          >
            Get Started
          </a>
        </div>
      </section>

      <section className="mt-16 grid gap-8 md:grid-cols-3">
        {[
          ["Verified interest", "Athletes explicitly share interest with your program. No cold outreach, no scraping rosters."],
          ["Trust & security", "RLS + coach verification gates contact info and exports. Only see athletes who want to hear from you."],
          ["Built for speed", "Filters by class year, event, state, and verification. CSV export and analytics dashboard (coming soon)."],
        ].map(([h, p]) => (
          <div key={h} className="rounded-2xl border border-app bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-app">{h}</h3>
            <p className="text-sm text-muted mt-2">{p}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-app">How It Works</h2>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-scarlet text-white font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-app">Sign up & select your program</h3>
              <p className="text-sm text-muted mt-1">
                Create an account and join your college track & field program. We support NCAA D1/D2/D3, NAIA, and NJCAA programs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-scarlet text-white font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-app">Verify your affiliation</h3>
              <p className="text-sm text-muted mt-1">
                Verify your email domain (e.g., @stanford.edu) or use DNS/HTTP proof to unlock full access to contact info and CSV exports.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-scarlet text-white font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-app">View interested athletes</h3>
              <p className="text-sm text-muted mt-1">
                See a ranked list of athletes who have expressed interest in your program, sorted by star rating and verification status. Filter by class year, event, state, and more.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-scarlet text-white font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-app">Export & recruit</h3>
              <p className="text-sm text-muted mt-1">
                Export athlete lists to CSV, view full profiles with verified results, and connect with athletes who want to hear from you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-app bg-card p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold text-app">Privacy & Security First</h2>
          <p className="text-muted">
            Athletes control what coaches see. Contact information is only shared if the athlete opts in. All data is protected by row-level security and coach verification gates.
          </p>
          <p className="text-sm text-muted">
            We never sell or share athlete data. Coaches only see athletes who have explicitly expressed interest in their program.
          </p>
        </div>
      </section>

      <section className="mt-16 text-center">
        <a
          href="/register?type=ncaa_coach"
          className="inline-flex rounded-xl px-5 py-3 bg-scarlet text-white font-semibold hover:bg-scarlet/90 transition"
        >
          Get Started
        </a>
        <p className="text-sm text-muted mt-4">
          Already have an account? <a href="/login?next=/coach/portal" className="text-scarlet hover:underline">Sign in</a>
        </p>
      </section>
    </main>
  );
}
