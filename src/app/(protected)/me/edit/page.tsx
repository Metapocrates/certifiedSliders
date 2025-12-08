// src/app/(protected)/me/edit/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SettingsForm from "../../settings/SettingsForm";
import AliasesManager from "../../settings/AliasesManager";
import SocialMediaEditor from "@/components/profile/SocialMediaEditor";
import ProfilePictureUploader from "@/components/profile/ProfilePictureUploader";
import SimpleProfileForm from "@/components/profile/SimpleProfileForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Edit Profile Details",
};

export default async function EditProfilePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/edit");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, class_year_locked_at, school_name, school_state, profile_pic_url, bio, gender, instagram_url, twitter_url, tiktok_url, youtube_url, user_type"
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

  const simpleInitial = {
    username: profile?.username ?? "",
    full_name: profile?.full_name ?? "",
    bio: profile?.bio ?? "",
    email: user.email ?? "",
  };

  const isAthlete = !profile?.user_type || profile?.user_type === 'athlete';

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-app">Edit Profile</h1>
        <p className="mt-2 text-sm text-muted">
          {isAthlete
            ? 'Update your public username, bio, school info, and profile picture.'
            : 'Update your profile picture, username, and bio.'}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-app bg-card p-5">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100">
          {initial.profile_pic_url ? (
            <Image
              src={initial.profile_pic_url}
              alt="Avatar"
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <Image src="/favicon-64x64.png" alt="Avatar" fill sizes="64px" className="object-contain p-2" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-app truncate">
            {initial.full_name || initial.username || initial.email}
          </div>
          <div className="text-sm text-muted truncate">{initial.email}</div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-app bg-card p-5">
        <ProfilePictureUploader currentImageUrl={initial.profile_pic_url} />
      </div>

      {isAthlete ? (
        <>
          <SettingsForm initial={initial} />

          <div id="social-media" className="mt-12 border-t border-app pt-8">
            <SocialMediaEditor
              initialData={{
                instagram_url: profile?.instagram_url ?? null,
                twitter_url: profile?.twitter_url ?? null,
                tiktok_url: profile?.tiktok_url ?? null,
                youtube_url: profile?.youtube_url ?? null,
              }}
            />
          </div>

          <div className="mt-12 border-t border-app pt-8">
            <h2 className="text-xl font-semibold text-app mb-2">Aliases & Nicknames</h2>
            <p className="text-sm text-muted mb-6">
              Add alternate names to make your profile easier to find in search. You can control which aliases are visible to the public.
            </p>
            <AliasesManager initialAliases={aliases ?? []} />
          </div>
        </>
      ) : (
        <SimpleProfileForm initial={simpleInitial} />
      )}
    </div>
  );
}
