export const IS_DEV = process.env.NODE_ENV !== "production";
export const PROOF_BYPASS =
    (process.env.PROOF_BYPASS ?? "").toLowerCase() === "true";
