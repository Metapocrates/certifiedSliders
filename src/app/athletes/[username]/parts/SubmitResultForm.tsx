"use client";

import { useState, useTransition } from "react";
import { submitResult } from "@/app/athletes/actions";

export default function SubmitResultForm() {
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setMsg("");
        startTransition(async () => {
          const res = await submitResult(fd);
          setMsg(res.message);
        });
      }}
      className="grid gap-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Event</span>
          <input name="event" className="input" placeholder="110H / 300H / 400 / LJ ..." required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Mark</span>
          <input name="mark" className="input" placeholder="14.76 / 38.90 / 4.20m" required />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Timing</span>
          <select name="timing" className="input">
            <option value="">—</option>
            <option value="FAT">FAT</option>
            <option value="HAND">Hand</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Wind</span>
          <input name="wind" className="input" type="number" step="0.1" placeholder="+2.0" />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Season</span>
          <select name="season" className="input" defaultValue="OUTDOOR">
            <option value="OUTDOOR">Outdoor</option>
            <option value="INDOOR">Indoor</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Meet name</span>
        <input name="meet_name" className="input" required />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Meet date</span>
          <input name="meet_date" className="input" type="date" required />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Proof URL</span>
          <input name="proof_url" className="input" type="url" placeholder="https://..." required />
        </label>
      </div>

      <button type="submit" disabled={isPending} className="btn">
        {isPending ? "Submitting..." : "Submit for Review"}
      </button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}
