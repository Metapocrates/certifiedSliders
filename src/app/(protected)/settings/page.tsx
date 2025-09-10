export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // (protected)/layout.tsx already redirects if no session, so session is present.
  const userId = session!.user.id;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url"
    )
    .eq("id", userId)
    .maybeSingle();

  // Provide safe defaults even if profile row doesn't exist yet
  const initialProfile = {
    id: profile?.id ?? userId,
    username: profile?.username ?? "",
    full_name: profile?.full_name ?? "",
    class_year: profile?.class_year ?? null,
    gender: profile?.gender ?? "",
    school_name: profile?.school_name ?? "",
    school_state: profile?.school_state ?? "",
    bio: profile?.bio ?? "",
    profile_pic_url: profile?.profile_pic_url ?? "",
  };

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        {error && (
          <p className="mt-2 text-sm text-red-600">Error: {error.message}</p>
        )}
      </header>

      <SettingsForm userId={userId} initialProfile={initialProfile} />
    </main>
  );
}
