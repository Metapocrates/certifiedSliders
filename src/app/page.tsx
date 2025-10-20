// src/app/page.tsx
import FeaturedProfiles from "@/components/home/FeaturedProfiles";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Certified Sliders</h1>
          <p className="text-sm text-gray-600">
            HS Track &amp; Field rankings and verified results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SafeLink
            href="/rankings"
            className="rounded-md border px-3 py-2 text-sm hover:opacity-90"
          >
            View Rankings
          </SafeLink>
          {user ? (
            <SafeLink
              href="/submit-result"
              className="rounded-md border px-3 py-2 text-sm bg-black text-white hover:opacity-90"
            >
              Submit Result
            </SafeLink>
          ) : (
            <SafeLink
              href="/login"
              className="rounded-md border px-3 py-2 text-sm bg-black text-white hover:opacity-90"
            >
              Sign In
            </SafeLink>
          )}
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Featured Athletes</h2>
          <span className="text-xs text-gray-500">
            Curated picks (3★+ with avatars)
          </span>
        </div>
        {/* Renders server-side */}
        <FeaturedProfiles limit={6} />
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="mb-2 font-medium">What’s new</h3>
        <ul className="list-inside list-disc text-sm text-gray-700">
          <li>Claim your profile and edit basic details</li>
          <li>Submit Athletic.net links for verification</li>
          <li>Browse rankings and athlete pages</li>
        </ul>
      </section>
    </div>
  );
}