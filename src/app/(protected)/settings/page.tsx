// src/app/(protected)/settings/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import EditProfileForm from "./EditProfileForm";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold mb-3">Profile Settings</h1>
        <p className="text-sm text-gray-600 mb-4">
          You must be signed in to edit your profile.
        </p>
        <Link href="/login?next=/settings" className="btn">Sign in</Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, class_year, school_name, school_state")
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    username: profile?.username ?? "",
    full_name: profile?.full_name ?? "",
    class_year: profile?.class_year ?? null,
    school_name: profile?.school_name ?? "",
    school_state: profile?.school_state ?? "",
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-semibold mb-3">Profile Settings</h1>
      <p className="text-sm text-gray-600 mb-6">
        Set your public username and basic details. Your public page will be at{" "}
        <code>/athletes/&lt;username&gt;</code>.
      </p>

      <div className="rounded-xl border p-4">
        <EditProfileForm initial={initial} />
      </div>
    </div>
  );
}