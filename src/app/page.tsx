import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import FeaturedProfileCard from "@/components/home/FeaturedProfileCard";
import NewsFeed from "@/components/home/NewsFeed";
import BlogList from "@/components/home/BlogList";
import ExternalNewsFeed from "@/components/home/ExternalNewsFeed";
import NewsMergedGrid from "@/components/home/NewsMergedGrid";



export default async function HomePage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = data?.username ?? null;
  }

  return (
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
        {/* LEFT: hero + featured + blog */}
        <div className="space-y-6">
          <section>
            <h1 className="text-3xl md:text-4xl font-bold">Certified Sliders</h1>
            <p className="mt-3 text-gray-600 max-w-prose">
              Build your athlete profile, upload a photo, and submit results for verification.
            </p>
            {!user ? (
              <div className="mt-6 flex gap-3">
                <Link href="/signin" className="btn">Sign in to get started</Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/me" className="btn">My Profile</Link>
                {username && (
                  <Link href={`/athletes/${username}?view=public#overview`} className="btn">
                    Public View
                  </Link>
                )}
                <Link href={`/athletes/${username ?? ""}#edit`} className="btn">
                  Edit Profile
                </Link>
              </div>
            )}
          </section>

          <section>
            <FeaturedProfileCard />
          </section>

          <section>
            <BlogList />
          </section>
        </div>

        {/* RIGHT: curated news + RSS */}
        <aside className="space-y-6">
          <NewsFeed />
          <NewsMergedGrid />
        </aside>
      </div>
    </div>
  );
}
