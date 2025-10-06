// src/app/(protected)/submit-result/ParseFromUrl.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { z } from "zod";

const ParseRequest = z.object({
  url: z.string().url("Enter a valid URL"),
});

const ParseResponse = z.object({
  ok: z.boolean(),
  data: z
    .object({
      event: z.string().optional(),
      mark: z.string().optional(),
      mark_seconds_adj: z.number().optional(),
      timing: z.enum(["FAT", "HAND"]).optional(),
      wind: z.string().nullable().optional(),
      meet_name: z.string().nullable().optional(),
      meet_date: z.string().nullable().optional(), // ISO date
      proof_url: z.string().url().optional(),
      athlete_id: z.string().optional(),
      notes: z.string().optional(),
      // ...anything else your parser returns, kept loose on purpose
    })
    .partial()
    .optional(),
  error: z.string().optional(),
});

type ParsedData = z.infer<typeof ParseResponse>["data"];

// Consumers can lift parsed data into their form.
export type ParseFromUrlProps = {
  onParsed?: (data: ParsedData) => void;
  className?: string;
};

export default function ParseFromUrl({ onParsed, className }: ParseFromUrlProps) {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAthleticNet = useMemo(() => /athletic\.net/i.test(url), [url]);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setParsed(null);

    const safe = ParseRequest.safeParse({ url });
    if (!safe.success) {
      setMsg(safe.error.issues[0]?.message || "Invalid URL");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/proofs/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        // Handle non-2xx with text fallback
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          setMsg(txt || `Parser error (${res.status})`);
          return;
        }

        const json = await res.json().catch(() => ({}));
        const parsedResp = ParseResponse.safeParse(json);
        if (!parsedResp.success) {
          setMsg("Unexpected parser response.");
          return;
        }

        if (!parsedResp.data.ok) {
          setMsg(parsedResp.data.error || "Could not parse this URL. You can still edit and submit manually.");
          return;
        }

        const data = parsedResp.data.data ?? null;
        setParsed(data);
        setMsg("Parsed successfully. Review and continue.");

        // Let parent form prefill
        onParsed?.(data ?? {});
      } catch (err: any) {
        setMsg(err?.message || "Network error. You can still edit and submit manually.");
      }
    });
  }

  return (
    <div className={className}>
      <form onSubmit={handleParse} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="url"
          inputMode="url"
          placeholder="Paste an Athletic.net (or meet) URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          disabled={isPending}
          aria-label="Result URL"
          required
        />
        <button
          type="submit"
          disabled={isPending || !url}
          className="rounded-lg border bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {isPending ? "Parsing…" : "Parse URL"}
        </button>
      </form>

      {/* Helpful hint */}
      <p className="mt-1 text-xs text-gray-500">
        {isAthleticNet
          ? "Detected Athletic.net — parsing usually extracts event, mark, wind, and meet."
          : "Parsing supports common result pages; if it fails, you can still fill the form manually."}
      </p>

      {/* Status */}
      {msg ? (
        <div
          className={`mt-2 rounded-md border px-3 py-2 text-sm ${
            /successfully/i.test(msg)
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-neutral-300 bg-neutral-50 text-neutral-800"
          }`}
        >
          {msg}
        </div>
      ) : null}

      {/* Preview */}
      {parsed ? (
        <div className="mt-3 rounded-lg border p-3 text-sm">
          <div className="mb-2 font-medium">Parsed preview</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            <dt className="text-gray-500">Event</dt>
            <dd>{parsed.event ?? "—"}</dd>

            <dt className="text-gray-500">Mark</dt>
            <dd>{parsed.mark ?? parsed.mark_seconds_adj ?? "—"}</dd>

            <dt className="text-gray-500">Timing</dt>
            <dd>{parsed.timing ?? "—"}</dd>

            <dt className="text-gray-500">Wind</dt>
            <dd>{parsed.wind ?? "—"}</dd>

            <dt className="text-gray-500">Meet</dt>
            <dd>{parsed.meet_name ?? "—"}</dd>

            <dt className="text-gray-500">Date</dt>
            <dd>{parsed.meet_date ?? "—"}</dd>

            <dt className="text-gray-500">Proof URL</dt>
            <dd className="truncate">{parsed.proof_url ?? "—"}</dd>
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            These values will prefill the form. You can edit any field before submitting.
          </p>
        </div>
      ) : null}
    </div>
  );
}
