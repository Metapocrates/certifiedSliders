// src/app/(protected)/settings/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SettingsForm from "./SettingsForm";
import AliasesManager from "./AliasesManager";

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
      "id, username, full_name, class_year, class_year_locked_at, school_name, school_state, profile_pic_url, bio"
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

      <div className="mt-8">
        <Link
          href="/settings/share-with-coaches"
          className="block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-app transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app mb-1">Share with Coaches</h2>
              <p className="text-sm text-muted-foreground">
                Manage academic info and contact details that coaches can view
              </p>
            </div>
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
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
