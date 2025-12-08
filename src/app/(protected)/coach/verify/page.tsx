import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import VerificationStatus from "@/components/coach/VerificationStatus";
import VerificationMethods from "@/components/coach/VerificationMethods";

export default async function CoachVerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ program?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServer();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/verify");
  }

  // Get user's program memberships
  const { data: memberships } = await supabase
    .from("program_memberships")
    .select("id, program_id, programs(id, name, short_name, domain)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/coach/onboarding");
  }

  // Determine active program
  const programParam = resolvedSearchParams?.program;
  const activeMembership = programParam
    ? memberships.find((m) => m.program_id === programParam)
    : memberships[0];

  if (!activeMembership) {
    redirect("/coach/verify");
  }

  const programId = activeMembership.program_id;
  // @ts-ignore
  const programName = activeMembership.programs?.name || "Your Program";
  // @ts-ignore
  const programDomain = activeMembership.programs?.domain;

  // Get verification status
  const { data: verificationData } = await supabase.rpc(
    "rpc_get_coach_verification_status",
    {
      _user_id: user.id,
      _program_id: programId,
    }
  );

  const verification = verificationData?.[0] || {
    score: 0,
    tier: 0,
    signals: {},
    last_computed_at: null,
  };

  // Get pending challenges
  const { data: challenges } = await supabase
    .from("coach_domain_challenges")
    .select("*")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Verification</h1>
        <p className="text-muted-foreground">
          Verify your affiliation with {programName}
        </p>
      </div>

      {/* Current Status */}
      <VerificationStatus
        verification={verification}
        programName={programName}
      />

      {/* Verification Methods */}
      <VerificationMethods
        programId={programId}
        programName={programName}
        programDomain={programDomain}
        currentTier={verification.tier}
        signals={verification.signals}
        challenges={challenges || []}
        userEmail={user.email || ""}
      />

      {/* Actions */}
      <div className="flex gap-4">
        <a
          href="/coach/portal"
          className="rounded-md px-4 py-2 border text-sm"
        >
          Back to Portal
        </a>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md px-4 py-2 bg-black text-app text-sm"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
