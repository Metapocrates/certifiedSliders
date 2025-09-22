"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNewsItem } from "./actions";

export default function NewsForm() {
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="p-4 rounded-xl border">
      <h3 className="font-semibold mb-2">Add News Item</h3>
      <form
        action={(fd) => {
          setMsg("");
          startTransition(async () => {
            const res = await createNewsItem(fd);
            setMsg(res.message);
            if (res.ok) {
              (document.getElementById("news-form") as HTMLFormElement | null)?.reset();
              router.refresh();
            }
          });
        }}
        id="news-form"
        className="grid gap-3 max-w-xl"
      >
        <label className="grid gap-1">
          <span className="text-sm font-medium">Title</span>
          <input name="title" className="input" required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Source (optional)</span>
            <input name="source" className="input" placeholder="USTFCCCA" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Published at</span>
            <input name="published_at" className="input" type="datetime-local" />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-medium">URL (optional)</span>
          <input name="url" className="input" type="url" placeholder="https://..." />
        </label>

        <button type="submit" disabled={isPending} className="btn">
          {isPending ? "Adding..." : "Add News"}
        </button>

        {msg && <div className="text-sm mt-1">{msg}</div>}
      </form>
    </div>
  );
}
