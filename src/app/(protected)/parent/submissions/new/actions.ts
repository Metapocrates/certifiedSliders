"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const ParentConfirmInputSchema = z.object({
  athleteId: z.string().uuid(),
  source: z.enum(["athleticnet", "milesplit", "other"]),
  proofUrl: z.string().url().max(2048),
  event: z.string().min(1),
  markText: z.string().min(1),
  markSeconds: z.number().nullable(),
  timing: z.enum(["FAT", "hand"]).nullable(),
  wind: z.number().nullable(),
  season: z.enum(["indoor", "outdoor"]),
  meetName: z.string().min(1),
  meetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wasEdited: z.boolean().optional(),
  originalData: z.any().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export type ParentConfirmInput = z.infer<typeof ParentConfirmInputSchema>;

// Helper to compute hash of source data
function computeSourceHash(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export type ConfirmActionResult =
  | { ok: true }
  | {
      ok: false;
      error?: {
        formErrors?: string[];
        fieldErrors?: Record<string, string[]>;
      };
      code?: string;
    };

export async function confirmParentSubmitAction(
  input: ParentConfirmInput
): Promise<ConfirmActionResult> {
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) {
    return { ok: false, error: { formErrors: ["You must be signed in."] } };
  }

  // Validate input
  const parsed = ParentConfirmInputSchema.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.flatten();
    return {
      ok: false,
      error: { formErrors: f.formErrors, fieldErrors: f.fieldErrors },
    };
  }
  const v = parsed.data;

  // Verify parent-athlete link exists and is accepted
  const { data: link } = await supabase
    .from("parent_links")
    .select("id, status")
    .eq("parent_user_id", user.id)
    .eq("athlete_id", v.athleteId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!link) {
    return {
      ok: false,
      error: {
        formErrors: [
          "You are not authorized to submit results for this athlete. Please ensure the athlete has accepted your link request.",
        ],
      },
      code: "NOT_LINKED",
    };
  }

  // Determine status based on whether data was edited
  const status = v.wasEdited ? "manual_review" : "pending";

  // Prepare source payload and hash if original data exists
  const sourcePayload = v.originalData ? v.originalData : null;
  const sourceHash = sourcePayload ? computeSourceHash(sourcePayload) : null;

  // Insert result
  const { error } = await supabase
    .from("results")
    .insert({
      athlete_id: v.athleteId,
      event: v.event,
      mark: v.markText,
      mark_seconds: v.markSeconds,
      timing: v.timing,
      wind: v.wind,
      season: v.season.toUpperCase(),
      meet_name: v.meetName,
      meet_date: v.meetDate,
      status,
      submitted_by: user.id,
      proof_url: v.proofUrl,
      source_payload: sourcePayload,
      source_hash: sourceHash,
      confidence: v.confidence ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: { formErrors: [`Insert failed: ${error.message}`] } };
  }

  return { ok: true };
}
