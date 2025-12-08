// src/app/(protected)/settings/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SettingsForm from "./SettingsForm";
import AliasesManager from "./AliasesManager";
import SocialMediaEditor from "@/components/profile/SocialMediaEditor";
import UserAvatar from "@/components/UserAvatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, class_year_locked_at, school_name, school_state, profile_pic_url, bio, instagram_url, twitter_url, tiktok_url, youtube_url"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: aliases } = await supabase
    .from("athlete_aliases")
    .select("id, alias, type, is_public, created_at")
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: false });

  const initial = {
    username: profile?.username ?? "",
    full_name: profile?.full_name ?? "",
    class_year: profile?.class_year ? String(profile.class_year) : "",
    class_year_locked_at: profile?.class_year_locked_at ?? null,
    school_name: profile?.school_name ?? "",
    school_state: profile?.school_state ?? "",
    profile_pic_url: profile?.profile_pic_url ?? "",
    bio: profile?.bio ?? "",
    email: user.email ?? "",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Set your public username and basic details. Your public page will be at{" "}
        <code className="rounded bg-gray-100 px-1">/athletes/&lt;username&gt;</code>.
      </p>

      <div className="mb-6 flex items-center gap-3 rounded-xl border p-4">
        <UserAvatar
          src={initial.profile_pic_url}
          alt="Avatar"
          size={56}
        />
        <div className="min-w-0">
          <div className="font-medium truncate">
            {initial.full_name || initial.username || initial.email}
          </div>
          <div className="text-sm text-gray-500 truncate">{initial.email}</div>
        </div>
      </div>

      <SettingsForm initial={initial} />

      <div id="social-media" className="mt-12 border-t pt-8">
        <SocialMediaEditor
          initialData={{
            instagram_url: profile?.instagram_url ?? null,
            twitter_url: profile?.twitter_url ?? null,
            tiktok_url: profile?.tiktok_url ?? null,
            youtube_url: profile?.youtube_url ?? null,
          }}
        />
      </div>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold mb-2">Aliases & Nicknames</h2>
        <p className="text-sm text-gray-500 mb-6">
          Add alternate names to make your profile easier to find in search. You can control which aliases are visible to the public.
        </p>
        <AliasesManager initialAliases={aliases ?? []} />
      </div>
    </div>
  );
}
