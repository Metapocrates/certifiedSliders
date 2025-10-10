// src/app/(protected)/me/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";
import ClaimTokenForm from "./ClaimTokenForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MePage() {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold mb-3">Your Account</h1>
        <p className="text-sm text-gray-600 mb-4">
          You’re not signed in.
        </p>
        <Link href="/login?next=/me" className="btn">Sign in</Link>
      </div>
    );
  }

  // Grab the user's profile row (if they’ve created or claimed one)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, school_name, school_state, class_year, profile_pic_url, claimed_by, claimed_at")
    .eq("id", user.id)
    .maybeSingle();

  const hasPublicProfile = Boolean(profile?.username);

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Account</h1>
        <div className="text-sm text-gray-500">{user.email}</div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100">
            {profile?.profile_pic_url ? (
              <Image
                src={profile.profile_pic_url}
                alt="Avatar"
                fill
                sizes="64px"
                className="object-cover"
                priority={false}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl">🙂</div>
            )}
          </div>

          <div className="min-w-0">
            <div className="font-medium truncate">
              {profile?.full_name || profile?.username || "Unnamed"}
            </div>
            <div className="text-sm text-gray-500">
              {profile?.school_name ? (
                <>
                  {profile.school_name} {profile.school_state ? `(${profile.school_state})` : ""}
                </>
              ) : (
                "No school on file"
              )}
              {profile?.class_year ? ` • ${profile.class_year}` : ""}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {hasPublicProfile ? (
              <>
                <Link href={`/athletes/${profile!.username!}`} className="btn">
                  View public page
                </Link>
                <Link href="/settings" className="btn">Edit profile</Link>
              </>
            ) : (
              <Link href="/settings" className="btn">Create profile</Link>
            )}
          </div>
        </div>
      </div>

      {/* Claim a pre-created profile (admin flow) */}
      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-medium mb-2">Claim a profile</h2>
        <p className="text-sm text-gray-600 mb-3">
          If an admin created a profile for you, use the claim token from your link to claim it.
        </p>
        <ClaimTokenForm redirectAfter="/me" />
        <p className="mt-2 text-xs text-gray-500">
          Tip: You can also claim via a link like <code>/claim?token=…</code>.
        </p>
      </div>
    </div>
  );
}