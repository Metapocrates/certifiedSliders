"use client";

import { useMemo, useState, useTransition } from "react";

type Submission = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "needs_review";
  mode: "two_link" | "bookmarklet" | "manual";
  profileUrl: string | null;
  resultUrl: string | null;
  contextUrl: string | null;
  createdAt: string;
  decidedAt: string | null;
  reason: string | null;
};

type Props = {
  submissions: Submission[];
  hasVerifiedIdentity: boolean;
};

type ApiResponse =
  | { ok: true; status: string }
  | { ok: false; error: string; code?: string };

export default function CertifyResultSection({ submissions, hasVerifiedIdentity }: Props) {
  const [profileUrl, setProfileUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [contextUrl, setContextUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedSubmissions = useMemo(
    () =>
      submissions.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [submissions]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasVerifiedIdentity) {
      setError("You need a verified Athletic.net profile before submitting results.");
      return;
    }

    setError(null);
    setMessage(null);

    const body: Record<string, string> = {
      profile_url: profileUrl.trim(),
      result_url: resultUrl.trim(),
    };
    if (contextUrl.trim()) {
      body.context_url = contextUrl.trim();
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/results/submit-two-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || !data.ok) {
          setError((data as any)?.error ?? "Unable to verify that result. Check the URLs and try again.");
          return;
        }
        setMessage("Result verified! It should appear in your pending list shortly.");
        setProfileUrl("");
        setResultUrl("");
        setContextUrl("");
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error. Please try again.");
      }
    });
  }

  return (
    <section className="mt-10 space-y-6 rounded-3xl border border-app bg-card p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Certify a result</p>
        <h2 className="text-2xl font-semibold text-app">Verify a performance</h2>
        <p className="text-sm text-muted">
          Paste your Athletic.net profile and the exact result link. We’ll confirm the link appears on your profile and
          add the result immediately.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-app/60 bg-white/70 p-4 shadow-inner">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Profile URL</label>
          <input
            type="url"
            placeholder="https://www.athletic.net/profile/YourSlug"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            className="w-full rounded-full border border-app px-4 py-2 text-sm"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Result URL</label>
          <input
            type="url"
            placeholder="https://www.athletic.net/result/AbCd123"
            value={resultUrl}
            onChange={(e) => setResultUrl(e.target.value)}
            className="w-full rounded-full border border-app px-4 py-2 text-sm"
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Context URL <span className="text-muted">(optional)</span>
          </label>
          <input
            type="url"
            placeholder="Meet or season page (optional)"
            value={contextUrl}
            onChange={(e) => setContextUrl(e.target.value)}
            className="w-full rounded-full border border-app px-4 py-2 text-sm"
            disabled={pending}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-scarlet text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-60 md:w-auto md:px-6"
        >
          {pending ? "Verifying…" : "Verify result"}
        </button>

        {message ? <p className="text-sm text-green-600">{message}</p> : null}
        {error ? <p className="text-sm text-scarlet">{error}</p> : null}
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-muted">Recent submissions</h3>
        {sortedSubmissions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-app/50 bg-muted/30 px-4 py-4 text-sm text-muted">
            No submissions yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedSubmissions.map((submission) => (
              <li key={submission.id} className="space-y-2 rounded-2xl border border-app/60 bg-white/60 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={badgeClass(submission.status)}>{submission.status.replace("_", " ")}</span>
                  <span className="text-xs text-muted">
                    Submitted {new Date(submission.createdAt).toLocaleString()}
                  </span>
                  {submission.decidedAt ? (
                    <span className="text-xs text-muted">
                      Updated {new Date(submission.decidedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 text-xs text-muted">
                  {submission.profileUrl ? (
                    <div>
                      Profile:{" "}
                      <a className="font-mono text-app underline" href={submission.profileUrl} target="_blank">
                        {submission.profileUrl}
                      </a>
                    </div>
                  ) : null}
                  {submission.resultUrl ? (
                    <div>
                      Result:{" "}
                      <a className="font-mono text-app underline" href={submission.resultUrl} target="_blank">
                        {submission.resultUrl}
                      </a>
                    </div>
                  ) : null}
                </div>
                {submission.reason ? (
                  <p className="text-xs text-scarlet">Note: {submission.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function badgeClass(status: Submission["status"]) {
  switch (status) {
    case "accepted":
      return "rounded-full bg-green-600/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-green-700";
    case "pending":
      return "rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-yellow-700";
    case "needs_review":
      return "rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-orange-700";
    case "rejected":
    default:
      return "rounded-full bg-red-600/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-red-700";
  }
}
