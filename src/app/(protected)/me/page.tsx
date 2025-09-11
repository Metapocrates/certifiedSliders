export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProofIngestForm from "@/app/(protected)/submit-result/ProofIngestForm";
import RecentSubmissions from "@/components/RecentSubmissions"; // requires { athleteId: string }

export default async function MePage() {
  const supabase = supabaseServer();

  // Auth guard
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/signin");

  const userId = session.user.id;
  const email = session.user.email ?? "";

  // Load profile; render page even if row doesn’t exist yet
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url, star_rating"
    )
    .eq("id", userId)
    .maybeSingle();

  // Optional admin flag (for quick links, if you want them here too)
  let isAdmin = false;
  {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    isAdmin = !!adminRow;
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      {/* Profile header */}
      <section className="flex items-center gap-4">
        {profile?.profile_pic_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Profile"
            src={profile.profile_pic_url}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200" />
        )}

        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.full_name || email}
          </h1>
          <p className="text-sm text-gray-600">
            @{profile?.username || "me"}
            {profile?.school_name ? ` • ${profile.school_name}` : ""}
            {profile?.school_state ? `, ${profile.school_state}` : ""}
            {profile?.class_year ? ` • Class of ${profile.class_year}` : ""}
          </p>
          {profile?.star_rating != null && (
            <p className="text-sm text-gray-600">
              Rating: {profile.star_rating}★
            </p>
          )}
          {profileErr && (
            <p className="text-xs text-red-600 mt-1">
              Error loading profile: {profileErr.message}
            </p>
          )}
          <div className="mt-1">
            <a href="/settings" className="text-xs underline">
              Edit profile
            </a>
          </div>
        </div>
      </section>

      {/* Admin quick links (optional) */}
      {isAdmin && (
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Admin</h2>
          <div className="flex gap-3 text-sm">
            <a href="/admin/results" className="underline">
              Pending Results
            </a>
          </div>
        </section>
      )}

      {/* Bio */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Bio</h2>
        {profile?.bio ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            No bio yet. <a className="underline" href="/settings">Add one</a>.
          </p>
        )}
      </section>

      {/* Submit Result */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Submit a Result</h2>
        <p className="text-sm text-gray-600">
          Paste a public Athletic.net or MileSplit link. We’ll auto-validate &
          auto-parse—no manual entry.
        </p>
        <ProofIngestForm />
      </section>

      {/* Recent Submissions (✅ pass required prop) */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent submissions</h2>
        <RecentSubmissions athleteId={userId} />
      </section>
    </main>
  );
}
