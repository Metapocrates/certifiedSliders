// src/app/(protected)/parent/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getUserRole } from "@/lib/roles";
import ComingSoonForm from "../../ncaa-coach/ComingSoonForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ParentComingSoonPage() {
  const supabase = await createSupabaseServer();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/parent");
  }

  // Get user's role info
  const roleInfo = await getUserRole(user.id);

  // If user doesn't have parent role, redirect to their correct dashboard
  if (!roleInfo || !roleInfo.availableRoles.includes("parent")) {
    redirect(roleInfo?.defaultRoute || "/me");
  }

  // Get current profile data for pre-filling form
  const { data: profile } = await supabase
    .from("profiles")
    .select("portal_notify_me, portal_feedback_note")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-app">Parent Portal</h1>
        <p className="text-xl text-muted">Coming Soon</p>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-app bg-card p-8 space-y-4">
        <h2 className="text-2xl font-semibold text-app">What to Expect</h2>
        <p className="text-muted-foreground leading-relaxed">
          The Parent Portal will help you support your athlete's track and field journey and navigate the recruiting process.
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>View and manage your athlete's profile and results</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Track performance progress and rankings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Submit meet results on behalf of your athlete</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Access resources for the recruiting process</span>
          </li>
        </ul>
      </div>

      {/* Coming Soon Form */}
      <div className="rounded-xl border border-app bg-card p-8">
        <ComingSoonForm
          initialNotify={profile?.portal_notify_me ?? false}
          initialFeedback={profile?.portal_feedback_note ?? ""}
        />
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted">
        <p>Have questions? Contact us at support@certifiedsliders.com</p>
      </div>
    </div>
  );
}
