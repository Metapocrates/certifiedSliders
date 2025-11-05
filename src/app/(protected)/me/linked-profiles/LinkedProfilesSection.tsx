"use client";

import { useMemo, useState, useTransition } from "react";

export type LinkedIdentity = {
  id: string;
  provider: string;
  externalId: string;
  profileUrl: string;
  numericId: string | null;
  claimUrl: string | null;
  status: "pending" | "verified" | "rejected" | "failed" | "expired";
  verified: boolean;
  verifiedAt: string | null;
  isPrimary: boolean;
  nonce: string | null;
  attempts: number;
  lastCheckedAt: string | null;
  errorText: string | null;
};

type ApiResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code?: string };

function normalizeIdentity(raw: any): LinkedIdentity {
  return {
    id: raw.id,
    provider: raw.provider ?? "athleticnet",
    externalId: raw.external_id ?? raw.externalId ?? "",
    profileUrl: raw.profile_url ?? raw.profileUrl ?? "",
    numericId: raw.external_numeric_id ?? raw.externalNumericId ?? null,
    claimUrl: raw.claim_url ?? raw.claimUrl ?? null,
    status: (raw.status ?? "pending") as LinkedIdentity["status"],
    verified: Boolean(raw.verified),
    verifiedAt: raw.verified_at ?? raw.verifiedAt ?? null,
    isPrimary: Boolean(raw.is_primary ?? raw.isPrimary),
    nonce: raw.nonce ?? null,
    attempts: raw.attempts ?? 0,
    lastCheckedAt: raw.last_checked_at ?? raw.lastCheckedAt ?? null,
    errorText: raw.error_text ?? raw.errorText ?? null,
  };
}

async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? "Request failed",
      code: data?.code,
    };
  }

  return { ok: true, ...(data as T) };
}

export default function LinkedProfilesSection({ identities }: { identities: LinkedIdentity[] }) {
  const [items, setItems] = useState<LinkedIdentity[]>(identities);
  const [pending, startTransition] = useTransition();
  const [profileUrl, setProfileUrl] = useState("");
  const [numericId, setNumericId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifiedCount = useMemo(() => items.filter((item) => item.verified).length, [items]);

  function upsertItem(entry: LinkedIdentity) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === entry.id);
      if (existingIdx === -1) {
        return [...prev, entry];
      }
      const next = prev.slice();
      next[existingIdx] = entry;
      return next;
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = profileUrl.trim();
    const trimmedNumeric = numericId.trim();
    if (!trimmed) return;
    if (!trimmedNumeric) {
      setError("Enter your Athletic.net athlete ID (numbers only).");
      return;
    }
    if (!/^[0-9]{4,}$/.test(trimmedNumeric)) {
      setError("Athlete ID should be digits only (at least 4 numbers).");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await apiFetch<{
        id: string;
        provider: string;
        external_id: string;
        profile_url: string;
        nonce: string;
        status: LinkedIdentity["status"];
        external_numeric_id: string | null;
        claim_url: string;
      }>("/api/verification/start", {
        method: "POST",
        body: JSON.stringify({ provider: "athleticnet", profile_url: trimmed, athlete_id: trimmedNumeric }),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setProfileUrl("");
      setNumericId("");
      setMessage("Verification started — paste the claim link on your Athletic.net feed while signed in, then tap it to verify.");

      upsertItem(
        normalizeIdentity({
          ...result,
          verified: false,
          verified_at: null,
          is_primary: false,
        })
      );
    });
  }

  function handleCopy(nonce: string | null) {
    if (!nonce) return;
    navigator.clipboard.writeText(nonce).then(() => {
      setMessage(`Copied code "${nonce}" to clipboard.`);
    });
  }

  function handleCopyNumeric(numeric: string | null) {
    if (!numeric) return;
    navigator.clipboard.writeText(numeric).then(() => {
      setMessage("Athlete ID copied to clipboard.");
    });
  }

  function handleCopyClaimLink(link: string | null) {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setMessage("Claim link copied — paste it on your Athletic.net feed and tap it while signed in.");
    });
  }

  function handleCheck(id: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await apiFetch<LinkedIdentity & { status: LinkedIdentity["status"] }>(
        "/api/verification/check",
        {
          method: "POST",
          body: JSON.stringify({ id }),
        }
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      upsertItem(normalizeIdentity(result));

      setMessage(result.verified ? "Profile verified!" : "Still pending. Make sure the code is visible and try again.");
    });
  }

  function handleSetPrimary(id: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await apiFetch<{ ok: true; id: string; is_primary: boolean }>(
        "/api/verification/set-primary",
        {
          method: "POST",
          body: JSON.stringify({ id }),
        }
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          isPrimary: item.id === id,
        }))
      );
      setMessage("Primary Athletic.net profile updated.");
    });
  }

  function handleRemove(id: string) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await apiFetch<{ ok: true }>("/api/verification/remove", {
        method: "POST",
        body: JSON.stringify({ id }),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("Link removed.");
    });
  }

  return (
    <section className="mt-8 space-y-5 rounded-3xl border border-app bg-card p-6 shadow-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Verification</p>
          <h2 className="text-2xl font-semibold text-app">Athletic.net profiles</h2>
          <p className="text-sm text-muted">
            Recommended: paste the claim link on your Athletic.net feed while signed in, then tap it to verify instantly.
            If your feed is public, you can still paste the verification code and run “Check verification” as a fallback.
            You’ll need your profile handle and your numeric Athlete ID (visible near your name on Athletic.net).
          </p>
        </div>
        <div className="rounded-full border border-app px-3 py-1 text-xs font-semibold text-muted">
          {verifiedCount} verified
        </div>
      </header>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="url"
          placeholder="https://www.athletic.net/profile/YourId"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          className="flex-1 rounded-full border border-app px-4 py-2 text-sm"
          disabled={pending}
          required
        />
        <input
          type="text"
          placeholder="Athlete ID (digits)"
          value={numericId}
          onChange={(e) => setNumericId(e.target.value)}
          className="w-full rounded-full border border-app px-4 py-2 text-sm sm:w-48"
          disabled={pending}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-scarlet px-5 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-60"
        >
          {pending ? "Starting…" : "Link profile"}
        </button>
      </form>

      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-scarlet">{error}</p> : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-app/60 bg-muted/40 px-4 py-4 text-sm text-muted">
          No Athletic.net profiles linked yet. Paste a profile URL above to get started.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="space-y-3 rounded-2xl border border-app bg-muted/40 p-4 text-sm shadow-inner"
            >
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={
                    item.verified && item.numericId
                      ? `https://www.athletic.net/athlete/${item.numericId}/track-and-field/`
                      : item.profileUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-app font-medium underline"
                >
                  {item.verified && item.numericId
                    ? `View on Athletic.net`
                    : item.profileUrl}
                </a>
                {item.isPrimary ? (
                  <span className="rounded-full bg-[#F5C518]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.35em] text-[#F5C518]">
                    Primary
                  </span>
                ) : null}
                <span className={statusBadgeClass(item.status, item.verified)}>
                  {statusLabel(item)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  Athlete ID: <span className="font-mono text-app">{item.numericId ?? "—"}</span>
                </span>
                {item.numericId ? (
                  <button
                    type="button"
                    onClick={() => handleCopyNumeric(item.numericId)}
                    className="rounded-full border border-app px-2 py-0.5 text-[11px] font-semibold text-app hover:bg-app hover:text-white"
                  >
                    Copy ID
                  </button>
                ) : null}
              </div>

              {!item.verified && item.claimUrl ? (
                <div className="rounded-2xl border border-app/50 bg-white/70 p-3 text-xs text-app shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">Claim link</p>
                      <p className="mt-1 break-all font-mono text-sm">{item.claimUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyClaimLink(item.claimUrl)}
                        className="rounded-full border border-app px-3 py-1 text-xs font-semibold text-app hover:bg-app hover:text-white"
                      >
                        Copy link
                      </button>
                      <a
                        href={item.claimUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-scarlet px-3 py-1 text-xs font-semibold text-white hover:bg-scarlet/90"
                      >
                        Open link
                      </a>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Paste this on your Athletic.net feed while signed in, then tap it to complete verification instantly.
                  </p>
                </div>
              ) : null}

              {item.nonce && !item.verified ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-app/40 bg-white/60 px-3 py-2 text-xs text-muted">
                  <span>
                    Add this code to your profile:{" "}
                    <span className="font-semibold text-app">{item.nonce}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.nonce)}
                    disabled={pending}
                    className="rounded-full border border-app px-3 py-1 text-xs font-semibold text-app transition hover:bg-white"
                  >
                    Copy code
                  </button>
                </div>
              ) : null}

              {item.errorText && !item.verified ? (
                <p className="text-xs text-scarlet">
                  Last check: {item.errorText}. Make sure the code is visible on your profile.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!item.verified ? (
                  <button
                    type="button"
                    onClick={() => handleCheck(item.id)}
                    disabled={pending}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-app px-3 text-xs font-semibold text-app transition hover:bg-white disabled:opacity-60"
                  >
                    {pending ? "Checking…" : "Check verification"}
                  </button>
                ) : null}
                {item.verified && !item.isPrimary ? (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(item.id)}
                    disabled={pending}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-app px-3 text-xs font-semibold text-app transition hover:bg-white disabled:opacity-60"
                  >
                    Set as primary
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={pending}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusLabel(item: Pick<LinkedIdentity, "status" | "verified">) {
  if (item.verified) return "Verified";
  switch (item.status) {
    case "failed":
      return "Check failed";
    case "pending":
      return "Pending verification";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    default:
      return item.status;
  }
}

function statusBadgeClass(status: LinkedIdentity["status"], verified: boolean) {
  if (verified) {
    return "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-green-700";
  }
  if (status === "failed" || status === "rejected") {
    return "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-red-700";
  }
  return "rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-yellow-700";
}
