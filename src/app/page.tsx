// src/app/page.tsx
import FeaturedProfilesCarousel from "@/components/home/FeaturedProfilesCarousel";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const spotlightCards = [
  {
    title: "Verified PRs only",
    description: "Admin-approved results keep the leaderboard clean and trustworthy.",
  },
  {
    title: "Built for athletes",
    description: "Track your progression, pin top events, and showcase your highlights.",
  },
  {
    title: "Coaches welcome",
    description: "Manage squads, confirm marks, and surface top talent in seconds.",
  },
];

const whatsNew = [
  {
    title: "Profile claiming",
    detail: "Athletes can now claim profiles, update bios, and add highlight media.",
  },
  {
    title: "Submission flow v2",
    detail: "Paste an Athletic.net or MileSplit link and get a decision in hours.",
  },
  {
    title: "Rankings refresh",
    detail: "Verified boards update daily with notes on adjustments and wind.",
  },
];

export default async function HomePage() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const primaryCta = user
    ? { href: "/submit-result", label: "Submit a result" }
    : { href: "/login", label: "Join the leaderboard" };

  return (
    <div className="space-y-16 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-app bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#C8102E] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,197,24,0.2),_transparent_52%)]" />
        <div className="relative flex flex-col gap-10 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:p-16">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
              Certified Sliders
            </span>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Own the official high school track &amp; field leaderboard.
            </h1>
            <p className="text-base text-white/80 sm:text-lg">
              Submit marks with proof, get verified by coaches, and see exactly where you rank—without the noise. Built by people who live and breathe the sport.
            </p>
            <div className="flex flex-wrap gap-3">
              <SafeLink
                href={primaryCta.href}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#111827] transition hover:-translate-y-0.5 hover:bg-[#F5C518] hover:shadow-lg"
              >
                {primaryCta.label}
              </SafeLink>
              <SafeLink
                href="/rankings"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                Browse rankings
              </SafeLink>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-col gap-6 text-sm text-white/80">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Why sliders trust us
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">Manual verification, transparent adjustments.</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/65">
                    Verified PRs this week
                  </p>
                  <p className="text-3xl font-semibold text-white">120+</p>
                  <p className="text-xs text-white/70">
                    Every mark checked by the admin crew before it hits the board.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/65">
                    Teams represented
                  </p>
                  <p className="text-3xl font-semibold text-white">65</p>
                  <p className="text-xs text-white/70">
                    The community keeps growing—coaches can request admin access any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {spotlightCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-app bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              {card.title}
            </p>
            <p className="mt-3 text-sm text-app">{card.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Featured athletes
            </p>
            <h2 className="text-2xl font-semibold text-app">Fresh highlights from the ladder</h2>
          </div>
          <SafeLink
            href="/athletes"
            className="inline-flex h-10 items-center justify-center rounded-full border border-app px-4 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
          >
            Explore athlete profiles
          </SafeLink>
        </div>
        <FeaturedProfilesCarousel />
      </section>

      <section className="mx-auto max-w-6xl rounded-3xl border border-app bg-card p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              What’s new
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-app">Constantly shipping for athletes &amp; coaches</h3>
            <p className="mt-3 text-sm text-muted">
              Certified Sliders evolves weekly based on feedback from athletes, parents, and admins. Here’s what rolled out recently.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {whatsNew.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-app bg-muted px-4 py-5 text-sm shadow-inner"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-app">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
