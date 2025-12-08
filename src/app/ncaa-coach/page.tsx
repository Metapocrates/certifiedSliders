// src/app/ncaa-coach/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getUserRole } from "@/lib/roles";
import ComingSoonForm from "./ComingSoonForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NCAACoachComingSoonPage() {
  const supabase = await createSupabaseServer();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/ncaa-coach");
  }

  // Get user's role info
  const roleInfo = await getUserRole(user.id);

  // If user doesn't have ncaa_coach role, redirect to their correct dashboard
  if (!roleInfo || !roleInfo.availableRoles.includes("ncaa_coach")) {
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
        <h1 className="text-4xl font-bold text-app">NCAA Coach Portal</h1>
        <p className="text-xl text-muted">Coming Soon</p>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-app bg-card p-8 space-y-4">
        <h2 className="text-2xl font-semibold text-app">What to Expect</h2>
        <p className="text-muted-foreground leading-relaxed">
          The NCAA Coach Portal will provide powerful tools to help you discover and recruit exceptional high school track and field athletes.
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Search and filter athletes by event, performance marks, and grad year</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Track verified results and performance trends</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Manage recruiting lists and communication</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-scarlet">✓</span>
            <span>Export prospect data for your coaching staff</span>
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
