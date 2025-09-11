export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProofIngestForm from "@/app/(protected)/submit-result/ProofIngestForm";

export default async function MePage() {
  const supabase = supabaseServer();

  // ✅ Guard here so we never read from a null session
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();

  if (sessionErr) {
    // If something went wrong reading the cookie, fail closed to /signin
    redirect("/signin");
  }
  if (!session) {
    redirect("/signin");
  }

  const userId = session.user.id;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url, star_rating"
    )
    .eq("id", userId)
    .maybeSingle(); // use maybeSingle so it's safe if row doesn't exist yet

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <section className="flex items-center gap-4">
        {profile?.profile_pic_url ? (
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
            {profile?.full_name || session.user.email}
          </h1>
          <p className="text-sm text-gray-600">
            @{profile?.username || "me"} • {profile?.school_name ?? "—"}
            {profile?.school_state ? `, ${profile.school_state}` : ""}
          </p>
          {profile?.star_rating != null && (
            <p className="text-sm text-gray-600">Rating: {profile.star_rating}★</p>
          )}
          {profileErr && (
            <p className="text-xs text-red-600 mt-1">Error: {profileErr.message}</p>
          )}
        </div>
      </section>

      {profile?.bio && (
        <section className="space-y-1">
          <h2 className="text-lg font-semibold">Bio</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {profile.bio}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Submit a Result</h2>
        <p className="text-sm text-gray-600">
          Paste a public Athletic.net or MileSplit link. We’ll auto-validate &
          auto-parse—no manual entry.
        </p>
        <ProofIngestForm />
      </section>
    </main>
  );
}
