import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getUserRole } from "@/lib/roles";

/**
 * Admin API endpoint to reset all test university data
 * DELETE /api/admin/reset-test-data
 *
 * Removes:
 * - All program memberships for test coaches
 * - All coach verification records for test coaches
 * - All coach domain challenges for test coaches
 * - All audit log entries for test coaches
 *
 * Does NOT remove:
 * - The test program itself
 * - Athlete data
 * - Real program data
 */
export async function DELETE(request: Request) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const roleInfo = await getUserRole(user.id);
  if (!roleInfo || roleInfo.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    // Get all test program IDs
    const { data: testPrograms, error: programsError } = await supabase
      .from("programs")
      .select("id")
      .eq("is_test_program", true);

    if (programsError) {
      throw new Error(`Failed to fetch test programs: ${programsError.message}`);
    }

    if (!testPrograms || testPrograms.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No test programs found",
        deleted: {
          memberships: 0,
          verifications: 0,
          challenges: 0,
          auditLogs: 0,
        },
      });
    }

    const testProgramIds = testPrograms.map(p => p.id);

    // Get all test coach user IDs
    const { data: testMemberships, error: membershipsError } = await supabase
      .from("program_memberships")
      .select("user_id")
      .in("program_id", testProgramIds);

    if (membershipsError) {
      throw new Error(`Failed to fetch test memberships: ${membershipsError.message}`);
    }

    const testCoachIds = [...new Set(testMemberships?.map(m => m.user_id) || [])];

    // Also get coaches explicitly marked as test coaches
    const { data: explicitTestCoaches, error: explicitError } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("is_test_coach", true);

    if (explicitError) {
      throw new Error(`Failed to fetch explicit test coaches: ${explicitError.message}`);
    }

    const allTestCoachIds = [...new Set([
      ...testCoachIds,
      ...(explicitTestCoaches?.map(m => m.user_id) || [])
    ])];

    if (allTestCoachIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No test coaches found to clean up",
        deleted: {
          memberships: 0,
          verifications: 0,
          challenges: 0,
          auditLogs: 0,
        },
      });
    }

    // Delete in order: dependent tables first, then memberships
    let deletedCounts = {
      memberships: 0,
      verifications: 0,
      challenges: 0,
      auditLogs: 0,
    };

    // 1. Delete coach_domain_challenges
    const { error: challengesError, count: challengesCount } = await supabase
      .from("coach_domain_challenges")
      .delete({ count: 'exact' })
      .in("user_id", allTestCoachIds);

    if (challengesError) {
      console.error("Error deleting challenges:", challengesError);
    } else {
      deletedCounts.challenges = challengesCount || 0;
    }

    // 2. Delete coach_verification
    const { error: verificationError, count: verificationCount } = await supabase
      .from("coach_verification")
      .delete({ count: 'exact' })
      .in("user_id", allTestCoachIds);

    if (verificationError) {
      console.error("Error deleting verifications:", verificationError);
    } else {
      deletedCounts.verifications = verificationCount || 0;
    }

    // 3. Delete audit_log entries (optional, for cleaner logs)
    const { error: auditError, count: auditCount } = await supabase
      .from("audit_log")
      .delete({ count: 'exact' })
      .in("actor_user_id", allTestCoachIds);

    if (auditError) {
      console.error("Error deleting audit logs:", auditError);
    } else {
      deletedCounts.auditLogs = auditCount || 0;
    }

    // 4. Delete program_memberships (CASCADE will handle related data)
    const { error: membershipsDeleteError, count: membershipsCount } = await supabase
      .from("program_memberships")
      .delete({ count: 'exact' })
      .or(`program_id.in.(${testProgramIds.join(',')}),is_test_coach.eq.true`);

    if (membershipsDeleteError) {
      throw new Error(`Failed to delete memberships: ${membershipsDeleteError.message}`);
    }

    deletedCounts.memberships = membershipsCount || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${allTestCoachIds.length} test coach(es)`,
      deleted: deletedCounts,
      testCoachIds: allTestCoachIds,
    });

  } catch (error: any) {
    console.error("Error resetting test data:", error);
    return NextResponse.json({
      error: error.message || "Failed to reset test data",
    }, { status: 500 });
  }
}
