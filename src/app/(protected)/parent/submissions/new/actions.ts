// src/app/(protected)/parent/submissions/new/actions.ts
// Parent result submission is disabled for beta
"use server";

export type ParentConfirmInput = {
  athleteId: string;
  source: "athleticnet" | "milesplit" | "other";
  proofUrl: string;
  event: string;
  markText: string;
  markSeconds: number | null;
  timing: "FAT" | "hand" | null;
  wind: number | null;
  season: "indoor" | "outdoor";
  meetName: string;
  meetDate: string;
  wasEdited?: boolean;
  originalData?: unknown;
  confidence?: number | null;
};

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
  _input: ParentConfirmInput
): Promise<ConfirmActionResult> {
  // Parent result submission is disabled for beta
  return {
    ok: false,
    error: {
      formErrors: ["Parent result submission is not available in the beta. Athletes can submit their own results directly."],
    },
    code: "FEATURE_DISABLED",
  };
}
