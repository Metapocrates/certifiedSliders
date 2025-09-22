import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const revalidate = 0;

type ClaimRow = {
  id: string;
  status: "pending" | "auto_verified" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  requester_user_id: string;
  evidence_url: string | null;
  evidence_kind: string | null;
  athlete: { id: string; slug: string | null; full_name: string | null } | null;
};

function isUUID(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-fA-F-]{36}$/.test(s);
}

export default async function ClaimsPage() {
  const supabase = createSupabaseServer();

  // Approve (Server Action; CSRF-safe; each action creates its own client)
  async function approveClaim(formData: FormData) {
    "use server";
    const claimId = formData.get("claim_id");
    const athleteSlug = (formData.get("athlete_slug") as string) || "";

    if (!isUUID(claimId)) throw new Error("Invalid claim_id");

    const sb = createSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) redirect("/login");

    const { error } = await sb.rpc("approve_claim", { p_claim_id: claimId });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/claims");
    if (athleteSlug) revalidatePath(`/athletes/${athleteSlug}`);
  }

  // Reject (Server Action; enforced by RLS; each action creates its own client)
  async function rejectClaim(formData: FormData) {
    "use server";
    const claimId = formData.get("claim_id");
    const athleteSlug = (formData.get("athlete_slug") as string) || "";

    if (!isUUID(claimId)) throw new Error("Invalid claim_id");

    const sb = createSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) redirect("/login");

    const { error } = await sb
      .from("athlete_claims")
      .update({ status: "rejected", decided_at: new Date().toISOString() })
      .eq("id", claimId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/claims");
    if (athleteSlug) revalidatePath(`/athletes/${athleteSlug}`);
  }

  const { data, error } = await supabase
    .from("athlete_claims")
    .select(
      `id,status,created_at,requester_user_id,evidence_url,evidence_kind,
       athlete:athletes(id,slug,full_name)`
    )
    .in("status", ["pending", "auto_verified"])
    .order("created_at", { ascending: false });

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  const rows = (data as ClaimRow[]) ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Claims</h1>

      {!rows.length ? (
        <div className="text-sm opacity-70">No pending claims.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <div className="font-medium">
                  {r.athlete?.full_name ?? "Unnamed"}{" "}
                  {r.athlete?.slug && (
                    <Link href={`/athletes/${r.athlete.slug}`} className="underline opacity-80">
                      view
                    </Link>
                  )}
                </div>
                <div className="text-xs opacity-70">
                  {new Date(r.created_at).toLocaleString()} • by {r.requester_user_id}
                </div>
                {r.evidence_url && (
                  <div className="text-xs">
                    evidence:{" "}
                    <a className="underline" href={r.evidence_url} target="_blank" rel="noreferrer">
                      {r.evidence_kind ?? "link"}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <form action={approveClaim}>
                  <input type="hidden" name="claim_id" value={r.id} />
                  <input type="hidden" name="athlete_slug" value={r.athlete?.slug ?? ""} />
                  <button className="rounded bg-emerald-600 px-3 py-1.5 text-white">Approve</button>
                </form>
                <form action={rejectClaim}>
                  <input type="hidden" name="claim_id" value={r.id} />
                  <input type="hidden" name="athlete_slug" value={r.athlete?.slug ?? ""} />
                  <button className="rounded bg-red-600 px-3 py-1.5 text-white">Reject</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
