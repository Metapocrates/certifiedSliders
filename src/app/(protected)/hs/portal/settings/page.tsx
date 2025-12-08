// src/app/(protected)/hs/portal/settings/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/settings");
  }

  const teamId = resolvedSearchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user has management permission
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, can_manage_staff")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRecord) {
    redirect("/hs/portal");
  }

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  // TODO: Add editable team settings form
  // TODO: Add staff management (invite/remove coaches)
  // TODO: Add logo upload
  // TODO: Add privacy settings

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/hs/portal" className="text-muted hover:text-app">
            ← Back to Portal
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Team Settings</h1>
        {team && (
          <p className="text-muted-foreground">
            Manage settings for {team.school_name}
          </p>
        )}
      </div>

      {/* Permission Notice */}
      {!staffRecord.can_manage_staff && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">ℹ️</div>
            <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">Limited Access</p>
              <p className="text-amber-800 dark:text-amber-200">
                You don&apos;t have permission to modify team settings. Contact your head coach to request access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Info Card */}
      {team && (
        <div className="rounded-xl border border-app bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-app mb-4">Team Information</h2>

          <div className="grid gap-4">
            <div>
              <p className="text-sm font-medium text-muted">School Name</p>
              <p className="text-lg text-app">{team.school_name}</p>
            </div>

            {(team.city || team.state) && (
              <div>
                <p className="text-sm font-medium text-muted">Location</p>
                <p className="text-lg text-app">
                  {[team.city, team.state].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            {team.division && (
              <div>
                <p className="text-sm font-medium text-muted">Division</p>
                <p className="text-lg text-app">{team.division}</p>
              </div>
            )}

            {team.gender && (
              <div>
                <p className="text-sm font-medium text-muted">Gender</p>
                <p className="text-lg text-app capitalize">{team.gender}</p>
              </div>
            )}

            {team.contact_email && (
              <div>
                <p className="text-sm font-medium text-muted">Contact Email</p>
                <p className="text-lg text-app">{team.contact_email}</p>
              </div>
            )}

            {team.website_url && (
              <div>
                <p className="text-sm font-medium text-muted">Website</p>
                <a
                  href={team.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg text-scarlet hover:underline"
                >
                  {team.website_url}
                </a>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted">Public Team Page</p>
              <p className="text-lg text-app">
                {team.is_public ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-amber-600">Disabled</span>
                )}
              </p>
              {team.is_public && (
                <Link
                  href={`/team/${teamId}`}
                  className="mt-1 inline-block text-sm text-scarlet hover:underline"
                >
                  View public page →
                </Link>
              )}
            </div>
          </div>

          {staffRecord.can_manage_staff && (
            <div className="pt-4 border-t border-app">
              <p className="text-sm text-muted mb-4">
                Team settings editor coming soon. Contact support to update team information.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Staff Management Placeholder */}
      {staffRecord.can_manage_staff && (
        <div className="rounded-xl border border-app bg-card p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
            👥
          </div>
          <h3 className="text-lg font-semibold text-app mb-2">Staff Management Coming Soon</h3>
          <p className="text-sm text-muted">
            Invite and manage assistant coaches and staff members
          </p>
        </div>
      )}
    </div>
  );
}
