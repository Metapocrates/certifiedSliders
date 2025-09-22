"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeaturedByUsername, clearFeatured } from "./actions";

export default function FeaturedForm({ currentUsername }: { currentUsername?: string | null }) {
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-2">Featured Profile</h3>
      <p className="text-sm text-gray-600 mb-3">
        Current: {currentUsername ? <span className="font-mono">@{currentUsername}</span> : <em>none</em>}
      </p>

      <form
        action={(fd) => {
          setMsg("");
          startTransition(async () => {
            const res = await setFeaturedByUsername(fd);
            setMsg(res.message);
            router.refresh();
          });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="grid gap-1">
          <span className="text-sm font-medium">Username</span>
          <input name="username" className="input" placeholder="e.g. kearlan" required />
        </label>
        <button type="submit" disabled={isPending} className="btn">
          {isPending ? "Saving..." : "Set Featured"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setMsg("");
            startTransition(async () => {
              const res = await clearFeatured();
              setMsg(res.message || "Cleared");
              router.refresh();
            });
          }}
        >
          Clear
        </button>
      </form>

      {msg && <div className="text-sm mt-2">{msg}</div>}
    </div>
  );
}
