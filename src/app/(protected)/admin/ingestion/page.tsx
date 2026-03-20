"use client";

import { useEffect, useState } from "react";

type Source = {
  id: string;
  key: string;
  name: string;
  base_url: string;
  is_enabled: boolean;
  crawl_delay_ms: number;
};

type StagingRecord = {
  id: string;
  athlete_name: string;
  grad_class: number | null;
  raw_rank: number | null;
  event: string | null;
  school: string | null;
  state: string | null;
  source_name: string;
  source_url: string;
  source_fetched_at: string;
  matched_profile_id: string | null;
  match_confidence: number | null;
  match_method: string | null;
  confidence: number;
  status: string;
  created_at: string;
};

type Run = {
  id: string;
  source_url: string;
  status: string;
  records_found: number;
  records_staged: number;
  records_skipped: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export default function AdminIngestionPage() {
  const [tab, setTab] = useState<"review" | "trigger" | "runs">("review");
  const [sources, setSources] = useState<Source[]>([]);
  const [staging, setStaging] = useState<StagingRecord[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [triggerUrl, setTriggerUrl] = useState("");
  const [triggerSource, setTriggerSource] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSources();
    loadStaging();
    loadRuns();
  }, []);

  async function loadSources() {
    const res = await fetch("/api/admin/ingestion?view=sources");
    const data = await res.json();
    setSources(data.sources ?? []);
  }

  async function loadStaging() {
    setLoading(true);
    const res = await fetch("/api/admin/ingestion?view=staging&status=pending");
    const data = await res.json();
    setStaging(data.staging ?? []);
    setLoading(false);
  }

  async function loadRuns() {
    const res = await fetch("/api/admin/ingestion?view=runs");
    const data = await res.json();
    setRuns(data.runs ?? []);
  }

  async function triggerIngestion() {
    if (!triggerSource || !triggerUrl) return;
    setMessage(null);
    setActionLoading("trigger");

    const res = await fetch("/api/admin/ingestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_key: triggerSource, url: triggerUrl }),
    });

    const data = await res.json();
    setActionLoading(null);

    if (data.ok) {
      setMessage({
        type: "ok",
        text: `Ingestion complete: ${data.records_staged} staged, ${data.records_skipped} skipped`,
      });
      loadStaging();
      loadRuns();
    } else {
      setMessage({ type: "error", text: data.error ?? "Ingestion failed" });
    }
  }

  async function reviewRecord(
    id: string,
    action: "approve" | "reject" | "merge"
  ) {
    setActionLoading(id);
    setMessage(null);

    const res = await fetch("/api/admin/ingestion/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staging_id: id, action }),
    });

    const data = await res.json();
    setActionLoading(null);

    if (data.ok) {
      setMessage({
        type: "ok",
        text: `Record ${action}${action === "merge" ? "d" : action === "approve" ? "d" : "ed"}`,
      });
      setStaging((prev) => prev.filter((s) => s.id !== id));
    } else {
      setMessage({ type: "error", text: data.error ?? "Action failed" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ranking Ingestion</h1>
        <p className="text-sm text-muted mt-1">
          Discover athletes from third-party rankings. All records require admin
          approval before publishing.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-app pb-2">
        {(["review", "trigger", "runs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              tab === t
                ? "bg-card border border-b-0 border-app text-app"
                : "text-muted hover:text-app"
            }`}
          >
            {t === "review"
              ? `Review (${staging.length})`
              : t === "trigger"
                ? "Trigger Run"
                : "Run History"}
          </button>
        ))}
      </div>

      {/* Review Tab */}
      {tab === "review" && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted">Loading staging records...</p>
          ) : staging.length === 0 ? (
            <p className="text-sm text-muted">No pending records to review.</p>
          ) : (
            staging.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-app bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-app">
                      {record.athlete_name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                      {record.grad_class && <span>Class of {record.grad_class}</span>}
                      {record.school && <span>{record.school}</span>}
                      {record.state && <span>{record.state}</span>}
                      {record.event && <span>{record.event}</span>}
                      {record.raw_rank != null && (
                        <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full">
                          {record.source_name} Rank: #{record.raw_rank}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <div>Confidence: {Math.round(record.confidence * 100)}%</div>
                    {record.matched_profile_id && (
                      <div className="text-emerald-600">
                        Match: {record.match_method} (
                        {Math.round((record.match_confidence ?? 0) * 100)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* Provenance */}
                <div className="text-xs text-muted border-t border-app/10 pt-2">
                  Source:{" "}
                  <a
                    href={record.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {record.source_name}
                  </a>{" "}
                  | Fetched:{" "}
                  {new Date(record.source_fetched_at).toLocaleString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {record.matched_profile_id ? (
                    <button
                      onClick={() => reviewRecord(record.id, "merge")}
                      disabled={actionLoading === record.id}
                      className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === record.id ? "..." : "Merge into Match"}
                    </button>
                  ) : (
                    <button
                      onClick={() => reviewRecord(record.id, "approve")}
                      disabled={actionLoading === record.id}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === record.id ? "..." : "Approve (New Profile)"}
                    </button>
                  )}
                  <button
                    onClick={() => reviewRecord(record.id, "reject")}
                    disabled={actionLoading === record.id}
                    className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Trigger Tab */}
      {tab === "trigger" && (
        <div className="max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value)}
              className="w-full rounded-lg border border-app bg-card px-3 py-2 text-sm"
            >
              <option value="">Select a source...</option>
              {sources
                .filter((s) => s.is_enabled)
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} {s.is_enabled ? "" : "(disabled)"}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Ranking Page URL
            </label>
            <input
              type="url"
              value={triggerUrl}
              onChange={(e) => setTriggerUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-app bg-card px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={triggerIngestion}
            disabled={!triggerSource || !triggerUrl || actionLoading === "trigger"}
            className="rounded-full bg-scarlet px-6 py-2 text-sm font-semibold text-white hover:bg-scarlet/90 disabled:opacity-50"
          >
            {actionLoading === "trigger" ? "Running... (this may take 10-15s)" : "Run Ingestion"}
          </button>
          {actionLoading === "trigger" && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Fetching page, parsing athletes, checking for duplicates...
            </div>
          )}
          <p className="text-xs text-muted">
            Only factual data will be extracted (name, class, event, school,
            state, rank reference). Editorial content is automatically filtered.
          </p>
        </div>
      )}

      {/* Runs Tab */}
      {tab === "runs" && (
        <div className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted">No ingestion runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-app text-left text-xs text-muted uppercase">
                  <tr>
                    <th className="pb-2 pr-4">URL</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Found</th>
                    <th className="pb-2 pr-4">Staged</th>
                    <th className="pb-2 pr-4">Skipped</th>
                    <th className="pb-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-app/10">
                      <td className="py-2 pr-4 max-w-xs truncate">
                        <a
                          href={run.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-muted"
                        >
                          {run.source_url}
                        </a>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            run.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : run.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{run.records_found}</td>
                      <td className="py-2 pr-4">{run.records_staged}</td>
                      <td className="py-2 pr-4">{run.records_skipped}</td>
                      <td className="py-2 text-xs text-muted">
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
