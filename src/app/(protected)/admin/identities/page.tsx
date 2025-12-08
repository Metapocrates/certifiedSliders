import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getAppBaseUrl } from "@/lib/env";
import { makeClaimToken } from "@/lib/verification/claimToken";
import SafeLink from "@/components/SafeLink";
import {
  clearAllIdentitiesAction,
  deleteIdentityAction,
  forceVerifyIdentityAction,
  resetIdentityAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IdentityRow = {
  id: string;
  user_id: string;
  provider: string;
  external_id: string | null;
  external_numeric_id: string | null;
  profile_url: string | null;
  status: string;
  verified: boolean;
  verified_at: string | null;
  is_primary: boolean;
  nonce: string | null;
  attempts: number | null;
  error_text: string | null;
  last_checked_at: string | null;
  created_at: string | null;
  profiles: {
    full_name: string | null;
    username: string | null;
    profile_id: string;
    school_name: string | null;
    class_year: number | null;
  } | null;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return value;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-800";
    case "pending":
    case "checking":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function AdminIdentitiesPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/identities");
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("external_identities")
    .select(
      `
      id,
      user_id,
      provider,
      external_id,
      external_numeric_id,
      profile_url,
      status,
      verified,
      verified_at,
      is_primary,
      nonce,
      attempts,
      error_text,
      last_checked_at,
      created_at,
      profiles:user_id (
        full_name,
        username,
        profile_id,
        school_name,
        class_year
      )
    `
    )
    .eq("provider", "athleticnet")
    .order("verified", { ascending: false })
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="container space-y-6 py-8">
        <header>
          <h1 className="text-2xl font-semibold">Linked Athletic.net Profiles</h1>
          <p className="text-sm text-red-600">{error.message}</p>
        </header>
      </div>
    );
  }

  const rawRows: IdentityRow[] = (data ?? []).map((row: any) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
  }));
  const appBaseUrl = getAppBaseUrl();
  const rows: (IdentityRow & { claimUrl: string | null })[] = await Promise.all(
    rawRows.map(async (row) => {
      let claimUrl: string | null = null;
      if (row.nonce) {
        try {
          const token = await makeClaimToken({
            row_id: row.id,
            user_id: row.user_id,
            provider: "athleticnet",
            external_id: row.external_id ?? "",
            external_numeric_id: row.external_numeric_id ?? null,
            nonce: row.nonce,
          });
          claimUrl = `${appBaseUrl}/claim/${encodeURIComponent(token)}`;
        } catch {
          claimUrl = null;
        }
      }
      return { ...row, claimUrl };
    })
  );
  const total = rows.length;
  const verifiedCount = rows.filter((row) => row.verified).length;
  const pendingCount = rows.filter((row) => !row.verified).length;

  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">
              Admin Utilities
            </p>
            <h1 className="text-2xl font-semibold">Linked Athletic.net Profiles</h1>
            <p className="text-sm text-muted">
              Inspect and manage athlete identity links. Use these controls to force verification,
              generate fresh verification codes, or remove connections for testing.
            </p>
          </div>
          <Link
            href="/me"
            className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            View self-service UI
          </Link>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 text-white">
            Total: {total}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
            Verified: {verifiedCount}
          </span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800">
            Pending: {pendingCount}
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/30 bg-white/5 p-6 text-sm text-muted">
          No Athletic.net identities found yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const profile = row.profiles;
            return (
              <article
                key={row.id}
                className="rounded-xl border border-white/15 bg-white/10 p-5 shadow-sm backdrop-blur"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">
                        {profile?.full_name || profile?.username || row.user_id}
                      </h2>
                      {profile?.profile_id ? (
                        <Link
                          href={`/athletes/${profile.profile_id}`}
                          className="rounded-full bg-white/10 px-2 py-1 text-xs text-white underline-offset-2 hover:underline"
                        >
                          View profile
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">
                      User ID: <span className="font-mono">{row.user_id}</span>{" "}
                      {profile?.school_name ? `• ${profile.school_name}` : ""}{" "}
                      {profile?.class_year ? `• ${profile.class_year}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-1 ${statusColor(row.status)}`}>
                        {row.status ?? "unknown"}
                      </span>
                      {row.verified ? (
                        <span className="rounded-full bg-green-600/20 px-2 py-1 text-green-100">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-600/20 px-2 py-1 text-yellow-100">
                          Unverified
                        </span>
                      )}
                      {row.is_primary ? (
                        <span className="rounded-full bg-blue-600/20 px-2 py-1 text-blue-100">
                          Primary
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>Linked: {fmtDate(row.created_at)}</p>
                    <p>Verified: {fmtDate(row.verified_at)}</p>
                    <p>Last checked: {fmtDate(row.last_checked_at)}</p>
                  </div>
                </div>

                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Athletic.net profile</dt>
                    <dd className="font-mono text-white">
                      {row.profile_url ? (
                        <SafeLink
                          href={row.profile_url}
                          target="_blank"
                          className="underline hover:text-app"
                        >
                          {row.profile_url}
                        </SafeLink>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">External ID</dt>
                    <dd className="font-mono text-white">{row.external_id ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Athlete ID</dt>
                    <dd className="font-mono text-white">{row.external_numeric_id ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Claim link</dt>
                    <dd className="break-all font-mono text-white">
                      {row.claimUrl ? (
                        <SafeLink
                          href={row.claimUrl}
                          target="_blank"
                          className="underline hover:text-app"
                        >
                          {row.claimUrl}
                        </SafeLink>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Nonce / Code</dt>
                    <dd className="font-mono text-white">{row.nonce ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Attempts / Errors</dt>
                    <dd className="text-white">
                      {row.attempts ?? 0}
                      {row.error_text ? (
                        <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-100">
                          {row.error_text}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <form action={forceVerifyIdentityAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-green-600 px-3 py-1.5 text-white transition hover:bg-green-500"
                    >
                      Force verify
                    </button>
                  </form>
                  <form action={forceVerifyIdentityAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="makePrimary" value="true" />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-white transition hover:bg-emerald-600"
                    >
                      Verify &amp; set primary
                    </button>
                  </form>
                  <form action={resetIdentityAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-yellow-600 px-3 py-1.5 text-white transition hover:bg-yellow-500"
                    >
                      Reset code
                    </button>
                  </form>
                  <form action={deleteIdentityAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-3 py-1.5 text-white transition hover:bg-red-500"
                    >
                      Delete link
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="rounded-xl border border-red-500/40 bg-red-900/20 p-5 text-sm text-red-100">
        <h2 className="text-lg font-semibold text-red-100">Danger zone</h2>
        <p className="mt-2 text-red-200">
          Remove <strong>all</strong> Athletic.net links across every user. This cannot be undone. Use only for
          emergency resets or pre-launch testing.
        </p>
        <form action={clearAllIdentitiesAction} className="mt-4 flex flex-col gap-3 text-red-100 sm:flex-row sm:items-center">
          <label className="w-full sm:w-auto">
            <span className="block text-xs uppercase tracking-wide text-red-200">
              Type <code className="rounded bg-red-800/60 px-1 py-0.5 text-xs">CONFIRM</code> to proceed
            </span>
            <input
              type="text"
              name="confirm"
              placeholder="CONFIRM"
              className="mt-1 w-full rounded-md border border-red-500/40 bg-red-800/40 px-3 py-2 text-sm text-red-100 placeholder:text-red-300 focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Delete all linked profiles
          </button>
        </form>
      </section>
    </div>
  );
}
