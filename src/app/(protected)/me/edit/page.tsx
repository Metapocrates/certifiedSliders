// src/app/(protected)/me/edit/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SettingsForm from "../../settings/SettingsForm";
import AliasesManager from "../../settings/AliasesManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Edit Profile Details",
};

export default async function EditProfilePage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/edit");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, school_name, school_state, profile_pic_url, bio, gender"
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
    school_name: profile?.school_name ?? "",
    school_state: profile?.school_state ?? "",
    profile_pic_url: profile?.profile_pic_url ?? "",
    bio: profile?.bio ?? "",
    email: user.email ?? "",
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-app">Edit Profile Details</h1>
        <p className="mt-2 text-sm text-muted">
          Update your public username, bio, school info, and profile picture. Your public page will be at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/athletes/&lt;username&gt;</code>.
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

      <SettingsForm initial={initial} />

      <div className="mt-12 border-t border-app pt-8">
        <h2 className="text-xl font-semibold text-app mb-2">Aliases & Nicknames</h2>
        <p className="text-sm text-muted mb-6">
          Add alternate names to make your profile easier to find in search. You can control which aliases are visible to the public.
        </p>
        <AliasesManager initialAliases={aliases ?? []} />
      </div>
    </div>
  );
}
