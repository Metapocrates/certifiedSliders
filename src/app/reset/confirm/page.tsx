"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetConfirmPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // When you land here from the email link, Supabase sets a recovery session.
  useEffect(() => {
    const supabase = supabaseBrowser();
    // Touch the session to ensure the client picked it up.
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (pwd.length < 6) return setMsg("Password must be at least 6 characters.");
    if (pwd !== pwd2) return setMsg("Passwords do not match.");
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => router.push("/login"), 800);
    } catch (err: any) {
      setMsg(err?.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>
      {!ready ? (
        <p>Preparing reset…</p>
      ) : (
        <form onSubmit={updatePassword} className="space-y-4 rounded-xl border p-4">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="min 6 characters"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm new password</label>
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <button type="submit" className="rounded bg-black px-4 py-2 text-app" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
          {msg ? <p className="text-sm mt-2">{msg}</p> : null}
        </form>
      )}
    </main>
  );
}
