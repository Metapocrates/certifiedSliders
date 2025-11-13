import "server-only";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import SidebarNav from "./_components/SidebarNav";

export default async function MeLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServer();

  // Require signed-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/me");

  // Fetch profile for sidebar context
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, profile_pic_url, profile_id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  // Note: We don't redirect non-athletes here because all user types need access to /me/edit
  // The /me (dashboard) page itself handles redirects for non-athletes

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-72 border-r bg-card/70 px-5 py-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">
              My Profile
            </p>
            <h2 className="mt-2 text-xl font-semibold text-app">
              {profile?.full_name || profile?.username || "User"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {profile?.user_type === 'athlete' || !profile?.user_type
                ? 'Manage your profile, events, and public page'
                : 'Manage your profile settings'}
            </p>
          </div>
          <SidebarNav
            profileId={profile?.profile_id ?? null}
            userType={profile?.user_type ?? null}
          />
        </div>
      </aside>
      <main className="flex-1 bg-app px-8 py-10">{children}</main>
    </div>
  );
}
