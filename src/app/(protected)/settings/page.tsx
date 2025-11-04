// src/app/(protected)/settings/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, class_year, school_name, school_state, profile_pic_url, bio"
    )
    .eq("id", user.id)
    .maybeSingle();

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Set your public username and basic details. Your public page will be at{" "}
        <code className="rounded bg-gray-100 px-1">/athletes/&lt;username&gt;</code>.
      </p>

      <div className="mb-6 flex items-center gap-3 rounded-xl border p-4">
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100">
          {initial.profile_pic_url ? (
            <Image
              src={initial.profile_pic_url}
              alt="Avatar"
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <Image src="/favicon-64x64.png" alt="Avatar" fill sizes="56px" className="object-contain p-1" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">
            {initial.full_name || initial.username || initial.email}
          </div>
          <div className="text-sm text-gray-500 truncate">{initial.email}</div>
        </div>
      </div>

      <SettingsForm initial={initial} />
    </div>
  );
}
