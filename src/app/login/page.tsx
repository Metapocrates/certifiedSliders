"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/browser";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<{ id: string; email: string | null } | null>(null);

  // show current session (if already logged in)
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setWho({ id: data.user.id, email: data.user.email ?? null });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    try {
      const supabase = supabaseBrowser();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Signed up. You are now logged in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg("Signed in.");
      }

      // refresh session indicator
      const { data } = await supabase.auth.getUser();
      if (data?.user) setWho({ id: data.user.id, email: data.user.email ?? null });

      // optional: go straight to admin page
      router.push("/admin/ratings");
    } catch (err: any) {
      setMsg(err?.message || "Auth error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      setWho(null);
      setMsg("Signed out.");
    } catch {
      setMsg("Sign-out error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Log in</h1>

      {who ? (
        <div className="mb-4 rounded border p-3 text-sm">
          <div>
            Signed in as <b>{who.email ?? who.id}</b>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 rounded bg-black px-3 py-1.5 text-app disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "…" : "Sign out"}
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-4">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded px-3 py-1.5 border ${mode === "signin" ? "bg-muted text-app" : "bg-card"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded px-3 py-1.5 border ${mode === "signup" ? "bg-muted text-app" : "bg-card"}`}
          >
            Sign up
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="min 6 characters"
            required
          />
          <p className="mt-1 text-xs text-muted">
            Enable Email/Password in Supabase → Auth → Providers.
          </p>
        </div>

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-app disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

<p className="mt-2 text-sm">
  <a href="/reset" className="underline">Forgot password?</a>
</p>

        {msg ? <p className="text-sm mt-2">{msg}</p> : null}
      </form>

      <p className="mt-4 text-sm text-gray-600">
        After signing in, go to <code>/admin/ratings</code> to set star tiers.
      </p>
    </main>
  );
}
