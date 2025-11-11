// src/app/(protected)/hs/portal/attest/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import AttestationQueue from "@/components/hs-portal/AttestationQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PendingResult = {
  result_id: number;
  athlete_id: string;
  athlete_name: string;
  athlete_profile_id: string | null;
  event: string;
  mark: string;
  meet_name: string;
  meet_date: string;
  season: string;
  proof_url: string | null;
  submitted_at: string;
  already_attested: boolean;
};

export default async function AttestPage({
  searchParams,
}: {
  searchParams?: { team?: string };
}) {
  const supabase = createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/attest");
  }

  const teamId = searchParams?.team;
  if (!teamId) {
    redirect("/hs/portal");
  }

  // Verify user has permission to attest
  const { data: staffRecord } = await supabase
    .from("team_staff")
    .select("id, can_attest_results")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRecord || !staffRecord.can_attest_results) {
    redirect("/hs/portal");
  }

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("school_name")
    .eq("id", teamId)
    .single();

  // Get attestation queue
  const { data: queue } = await supabase.rpc("rpc_get_team_attestation_queue", {
    p_team_id: teamId,
    p_limit: 50,
  });

  const pendingResults = (queue || []) as PendingResult[];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/hs/portal" className="text-muted hover:text-app">
            ← Back to Portal
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-app">Attest Results</h1>
        {team && (
          <p className="text-muted-foreground">
            Review and verify results submitted by {team.school_name} athletes
          </p>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">ℹ️</div>
          <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">About result attestation</p>
            <p className="text-blue-800 dark:text-blue-200">
              As a coach, you can attest (verify) results submitted by your athletes. Your attestation
              adds credibility and helps results get verified faster. Approving a result signals to admins
              that it&apos;s legitimate. Rejecting removes it from the queue.
            </p>
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      {pendingResults.length > 0 && (
        <div className="rounded-xl border border-app bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Pending Attestations</p>
              <p className="text-2xl font-bold text-app">{pendingResults.length}</p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingResults.length === 0 && (
        <div className="rounded-xl border border-app bg-card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl mb-4">
            ✓
          </div>
          <h3 className="text-lg font-semibold text-app mb-2">All Caught Up!</h3>
          <p className="text-sm text-muted">
            There are no pending results awaiting attestation
          </p>
        </div>
      )}

      {/* Attestation Queue */}
      {pendingResults.length > 0 && (
        <AttestationQueue results={pendingResults} teamId={teamId} />
      )}
    </div>
  );
}
