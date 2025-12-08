// Server actions for admin rating review
"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type RatingInput = {
  result_id: number;
  athlete_id: string;
  username: string;
  full_name: string;
  event: string;
  mark: string;
  mark_seconds_adj: number | null;
  mark_metric: number | null;
  meet_date: string;
  meet_name: string;
  season: string;
  grade: number;
  class_year: number;
  gender: string;
  proof_url: string | null;
  wind: number | null;
  timing: string;
  status: string;
  auto_stars: number;
  has_proof: boolean;
  is_fat: boolean;
  is_wind_legal: boolean;
  is_recent: boolean;
  is_quality_meet: boolean;
  latest_decision: {
    decision: string;
    final_stars: number | null;
    reason: string;
    notes: string;
    decided_at: string;
    decided_by: string;
  } | null;
  created_at: string;
};

export async function getPendingRatingReviewsAction() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return { ok: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("v_pending_rating_reviews")
      .select("*")
      .order("auto_stars", { ascending: false })
      .order("meet_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching pending reviews:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, reviews: data as RatingInput[] };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { ok: false, error: "Failed to fetch pending reviews" };
  }
}

export async function getRatingInputsForAthleteAction(athleteId: string) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return { ok: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase.rpc("get_rating_inputs", {
      p_athlete_id: athleteId
    });

    if (error) {
      console.error("Error fetching rating inputs:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, inputs: data as RatingInput[] };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { ok: false, error: "Failed to fetch rating inputs" };
  }
}

export async function submitRatingDecisionAction(formData: FormData) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return { ok: false, error: "Unauthorized" };
    }

    const result_id = parseInt(formData.get("result_id") as string);
    const decision = formData.get("decision") as string;
    const final_stars = formData.get("final_stars") ? parseInt(formData.get("final_stars") as string) : null;
    const reason = formData.get("reason") as string;
    const notes = formData.get("notes") as string | null;

    if (!result_id || !decision || !reason) {
      return { ok: false, error: "Missing required fields" };
    }

    if (!["approve", "decline", "needs_info"].includes(decision)) {
      return { ok: false, error: "Invalid decision" };
    }

    if (decision === "approve" && !final_stars) {
      return { ok: false, error: "Final stars required for approval" };
    }

    const { data, error } = await supabase.rpc("submit_rating_decision", {
      p_result_id: result_id,
      p_decision: decision,
      p_final_stars: final_stars,
      p_reason: reason,
      p_notes: notes || null
    });

    if (error) {
      console.error("Error submitting decision:", error);
      return { ok: false, error: error.message };
    }

    revalidatePath("/admin/rating-review");
    return { ok: true, decision: data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { ok: false, error: "Failed to submit decision" };
  }
}
