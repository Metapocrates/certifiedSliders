import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/admin/ingestion/review — Approve, reject, or merge staging records
 *
 * COMPLIANCE: This is the required gate. Nothing from staging reaches
 * production without explicit admin approval through this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { staging_id, action, notes, merge_profile_id } = body;

    if (!staging_id || !action) {
      return NextResponse.json(
        { error: "staging_id and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "merge"].includes(action)) {
      return NextResponse.json(
        { error: "action must be approve, reject, or merge" },
        { status: 400 }
      );
    }

    const adminSupabase = createSupabaseAdmin();

    // Get the staging record
    const { data: staging, error: fetchError } = await adminSupabase
      .from("ingestion_staging")
      .select("*")
      .eq("id", staging_id)
      .single();

    if (fetchError || !staging) {
      return NextResponse.json(
        { error: "Staging record not found" },
        { status: 404 }
      );
    }

    if (staging.status !== "pending") {
      return NextResponse.json(
        { error: `Record already ${staging.status}` },
        { status: 409 }
      );
    }

    if (action === "reject") {
      // Simply mark as rejected
      await adminSupabase
        .from("ingestion_staging")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq("id", staging_id);

      return NextResponse.json({ ok: true, action: "rejected" });
    }

    if (action === "approve") {
      // Create a new profile seed from staging data
      // This creates a minimal profile that can be claimed by the athlete later
      // profiles.id is normally tied to auth.users.id, but seeded profiles
      // have no auth user yet — generate a UUID as placeholder until claimed
      const profileData: Record<string, unknown> = {
        id: randomUUID(),
        full_name: staging.athlete_name,
        class_year: staging.grad_class,
        school_name: staging.school,
        school_state: staging.state,
        user_type: "athlete",
        status: "active",
      };

      const { data: newProfile, error: profileError } = await adminSupabase
        .from("profiles")
        .insert(profileData)
        .select("id")
        .single();

      if (profileError) {
        return NextResponse.json(
          { error: `Failed to create profile: ${profileError.message}` },
          { status: 500 }
        );
      }

      // Update staging record
      await adminSupabase
        .from("ingestion_staging")
        .update({
          status: "approved",
          matched_profile_id: newProfile.id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq("id", staging_id);

      // Audit log
      await adminSupabase.from("audit_log").insert({
        actor_user_id: user.id,
        action: "ingestion_staging_approved",
        entity: "profile",
        entity_id: newProfile.id,
        context: {
          staging_id,
          source_name: staging.source_name,
          athlete_name: staging.athlete_name,
          source_url: staging.source_url,
        },
      });

      return NextResponse.json({
        ok: true,
        action: "approved",
        profile_id: newProfile.id,
      });
    }

    if (action === "merge") {
      // Merge staging data into an existing profile
      const targetId = merge_profile_id ?? staging.matched_profile_id;

      if (!targetId) {
        return NextResponse.json(
          { error: "merge_profile_id is required for merge action" },
          { status: 400 }
        );
      }

      // COMPLIANCE: Never overwrite higher-confidence existing data.
      // Only fill in missing fields on the target profile.
      const { data: existing } = await adminSupabase
        .from("profiles")
        .select("id, full_name, class_year, school_name, school_state")
        .eq("id", targetId)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: "Target profile not found" },
          { status: 404 }
        );
      }

      const updates: Record<string, unknown> = {};
      // Only fill gaps — never overwrite existing data
      if (!existing.class_year && staging.grad_class) {
        updates.class_year = staging.grad_class;
      }
      if (!existing.school_name && staging.school) {
        updates.school_name = staging.school;
      }
      if (!existing.school_state && staging.state) {
        updates.school_state = staging.state;
      }

      if (Object.keys(updates).length > 0) {
        await adminSupabase
          .from("profiles")
          .update(updates)
          .eq("id", targetId);
      }

      // Mark staging record as merged
      await adminSupabase
        .from("ingestion_staging")
        .update({
          status: "merged",
          matched_profile_id: targetId,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq("id", staging_id);

      // Audit log
      await adminSupabase.from("audit_log").insert({
        actor_user_id: user.id,
        action: "ingestion_staging_merged",
        entity: "profile",
        entity_id: targetId,
        context: {
          staging_id,
          source_name: staging.source_name,
          athlete_name: staging.athlete_name,
          fields_updated: Object.keys(updates),
        },
      });

      return NextResponse.json({
        ok: true,
        action: "merged",
        profile_id: targetId,
        fields_updated: Object.keys(updates),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
