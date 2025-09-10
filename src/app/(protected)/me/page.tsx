export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import ProofIngestForm from "@/app/(protected)/submit-result/ProofIngestForm";

export default async function MePage() {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  // layout already redirected unauthenticated users
  // we can safely assume session is present here
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url, star_rating")
    .eq("id", session!.user.id)
    .single();

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <section className="flex items-center gap-4">
        {profile?.profile_pic_url ? (
          <img alt="Profile" src={profile.profile_pic_url} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{profile?.full_name || session!.user.email}</h1>
          <p className="text-sm text-gray-600">
            @{profile?.username || "me"} • {profile?.school_name ?? "—"}
            {profile?.school_state ? `, ${profile.school_state}` : ""}
          </p>
          {profile?.star_rating != null && (
            <p className="text-sm text-gray-600">Rating: {profile.star_rating}★</p>
          )}
        </div>
      </section>

      {profile?.bio && (
        <section className="space-y-1">
          <h2 className="text-lg font-semibold">Bio</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Submit a Result</h2>
        <p className="text-sm text-gray-600">
          Paste a public Athletic.net or MileSplit link. We’ll auto-validate & auto-parse—no manual entry.
        </p>
        <ProofIngestForm />
      </section>
    </main>
  );
}
