"use client";

type Props = {
  data: {
    status?: string;
    confidence?: number;
    resultId?: number;
    proofId?: number;
    event?: string | null;
    mark_seconds?: number | null;
    timing?: "FAT" | "hand" | null;
    meet?: string | null;
    date?: string | null;
    error?: string | { message?: string } | null;
  };
};

function fmtSeconds(sec?: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  return sec.toFixed(2);
}

export default function ResultCard({ data }: Props) {
  const {
    status = "pending",
    confidence,
    resultId,
    proofId,
    event,
    mark_seconds,
    timing,
    meet,
    date,
    error,
  } = data;

  const errText =
    typeof error === "string" ? error :
    (typeof error === "object" && error?.message) ? error.message :
    null;

  return (
    <div className="rounded border bg-card p-4 shadow-sm space-y-2">
      {errText && (
        <div className="text-sm text-red-700 border border-red-200 bg-red-50 p-3 rounded whitespace-pre-line">
          {errText}
        </div>
      )}

      {!errText && (
        <>
          <div className="text-sm text-gray-600">
            Status: <span className="font-medium capitalize">{status}</span>
            {typeof confidence === "number" && (
              <> • Confidence: <span className="font-medium">{confidence}%</span></>
            )}
          </div>
          <div className="text-lg font-semibold">
            {(event && event !== "—") ? event : "—"} — {fmtSeconds(mark_seconds)}
            {timing ? ` (${timing})` : ""}
          </div>
          {(meet || date) && (
            <div className="text-sm text-gray-700">
              {meet || "Unknown meet"}{date ? ` • ${date}` : ""}
            </div>
          )}
          <div className="text-xs text-muted">
            Result #{resultId} • Proof #{proofId}
          </div>
          <div className="pt-2">
            {typeof resultId === "number" && (
              <form action={`/api/proofs/verify`} method="post">
                <input type="hidden" name="resultId" value={resultId} />
                <button type="submit" className="rounded border px-3 py-1 text-sm">
                  Verify
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
