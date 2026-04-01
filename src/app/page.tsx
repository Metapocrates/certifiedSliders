// src/app/page.tsx
import FeaturedProfilesCarousel from "@/components/home/FeaturedProfilesCarousel";
import BlogList from "@/components/home/BlogList";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import Image from "next/image";
import ActivityFeed from "@/components/ActivityFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const numberFormatter = new Intl.NumberFormat("en-US");
function formatNumber(n: number) {
  return numberFormatter.format(n);
}

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { count: totalAthletes } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_type", "athlete")
    .eq("status", "active");

  const { count: totalVerifiedResults } = await supabase
    .from("results")
    .select("id", { count: "exact", head: true })
    .eq("status", "verified");

  const { data: stateRows } = await supabase
    .from("profiles")
    .select("school_state")
    .eq("user_type", "athlete")
    .not("school_state", "is", null)
    .neq("school_state", "");

  const statesRepresented = new Set(
    (stateRows || [])
      .map((r) => r.school_state?.trim())
      .filter((s) => s && s.length === 2)
  ).size;

  const THRESHOLDS = { athletes: 50, results: 100, states: 10 };
  const showDynamic =
    (totalAthletes ?? 0) >= THRESHOLDS.athletes &&
    (totalVerifiedResults ?? 0) >= THRESHOLDS.results &&
    statesRepresented >= THRESHOLDS.states;

  const stats = showDynamic
    ? [
        { label: "Athletes", value: formatNumber(totalAthletes ?? 0) },
        { label: "Verified Results", value: formatNumber(totalVerifiedResults ?? 0) },
        { label: "States", value: String(statesRepresented) },
      ]
    : [
        { label: "Coverage", value: "50 States" },
        { label: "Events", value: "15+" },
        { label: "Divisions", value: "D1–D3" },
      ];

  const primaryCta = user
    ? { href: "/submit-result", label: "Submit a Result" }
    : { href: "/login", label: "Get Started — It's Free" };

  return (
    <div className="space-y-20 pb-20">
      {/* ─── HERO ─── */}
      <section className="relative -mx-4 -mt-10 overflow-hidden sm:-mx-6 lg:-mx-8" style={{ background: 'hsl(220 26% 10%)' }}>
        {/* Subtle accent glow */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rotate-12 rounded-full bg-red-900/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-yellow-700/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24 lg:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
            {/* Left — copy */}
            <div className="max-w-xl space-y-8">
              <div className="flex items-center gap-3">
                <span className="relative h-10 w-10">
                  <Image src="/logo.svg" alt="Certified Sliders" fill sizes="40px" priority />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">
                  Certified Sliders
                </span>
              </div>

              <h1 className="font-display text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                THE PREMIER
                <br />
                <span className="text-primary">HS TRACK &amp; FIELD</span>
                <br />
                PLATFORM
              </h1>

              <p className="max-w-md text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
                Submit marks with proof, get verified by our admin team, earn star ratings, and get discovered by college coaches.
              </p>

              <div className="flex flex-wrap gap-4">
                <SafeLink
                  href={primaryCta.href}
                  className="inline-flex h-12 items-center rounded-lg bg-primary px-7 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110"
                >
                  {primaryCta.label}
                </SafeLink>
                <SafeLink
                  href="/rankings"
                  className="inline-flex h-12 items-center rounded-lg border border-primary-foreground/40 px-7 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:border-primary-foreground/70 hover:bg-primary-foreground/10"
                >
                  Browse Rankings
                </SafeLink>
              </div>
            </div>

            {/* Right — stat blocks */}
            <div className="grid w-full max-w-sm grid-cols-1 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                 className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-6 py-5 backdrop-blur"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/80">
                    {stat.label}
                  </p>
                  <p className="font-display text-4xl text-primary-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ACTIVITY FEED (logged in) ─── */}
      {user && (
        <section className="mx-auto max-w-6xl space-y-6">
          <SectionLabel sub="Your Feed">Recent Activity</SectionLabel>
          <ActivityFeed />
        </section>
      )}

      {/* ─── VALUE PROPS ─── */}
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {[
          {
            title: "Verified PRs Only",
            desc: "Every mark is admin-reviewed before it hits the leaderboard. No inflated stats.",
          },
          {
            title: "Built for Athletes",
            desc: "Upload PRs, earn star ratings, build your profile, and signal college interest.",
          },
          {
            title: "Coach Portal",
            desc: "College coaches discover top talent in one place with analytics and watchlists.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="group rounded-xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-editorial"
          >
            <h3 className="font-display text-xl text-foreground">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {card.desc}
            </p>
          </div>
        ))}
      </section>

      {/* ─── FEATURED ATHLETES ─── */}
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionLabel sub="Featured Athletes">Fresh from the Ladder</SectionLabel>
          <SafeLink
            href="/athletes"
            className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
          >
            Explore Profiles →
          </SafeLink>
        </div>
        <FeaturedProfilesCarousel />
      </section>

      {/* ─── BLOG ─── */}
      <section className="mx-auto max-w-6xl space-y-6">
        <SectionLabel sub="From the Blog">Stories from the Track</SectionLabel>
        <BlogList />
      </section>

      {/* ─── WHAT'S NEW ─── */}
      <section className="mx-auto max-w-6xl rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <SectionLabel sub="Changelog">What&apos;s New</SectionLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We ship weekly based on feedback from athletes, parents, and coaches.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Profile Claiming", detail: "Athletes can claim profiles, update bios, and add highlight media." },
              { title: "Submission Flow v2", detail: "Paste an Athletic.net link and get verified in minutes." },
              { title: "Star Ratings", detail: "Admin-assigned star ratings by class year and event." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-muted px-5 py-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal */}
      <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
        <SafeLink href="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </SafeLink>
        <span className="mx-2">·</span>
        <SafeLink href="/terms" className="hover:text-foreground hover:underline">
          Terms of Service
        </SafeLink>
      </div>
    </div>
  );
}

/* ─── Section heading helper ─── */
function SectionLabel({
  sub,
  children,
}: {
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
        {sub}
      </p>
      <h2 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">
        {children}
      </h2>
    </div>
  );
}
