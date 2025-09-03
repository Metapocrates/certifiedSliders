"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const redirectTo =
        (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") + "/reset/confirm";
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMsg("Check your email for a reset link.");
    } catch (err: any) {
      setMsg(err?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset your password</h1>
      <form onSubmit={sendReset} className="space-y-4 rounded-xl border p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            required
          />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        {msg ? <p className="text-sm mt-2">{msg}</p> : null}
      </form>
    </main>
  );
}
