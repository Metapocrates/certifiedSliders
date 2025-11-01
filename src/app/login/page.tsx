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
  const [oauthErr, setOauthErr] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<{ id: string; email: string | null } | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState(false);

  async function syncServerSession(sb: ReturnType<typeof supabaseBrowser>) {
    try {
      const { data: sessionData } = await sb.auth.getSession();
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: sessionData.session?.access_token ?? null,
          refresh_token: sessionData.session?.refresh_token ?? null,
        }),
      });
    } catch {
      // Ignore sync errors; AuthListener will retry shortly.
    }
  }

  // Show current session (if already logged in)
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setWho({ id: data.user.id, email: data.user.email ?? null });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return; // guard against double-fire
    setMsg("");
    setOauthErr("");
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

      // Refresh session indicator
      const { data } = await supabase.auth.getUser();
      if (data?.user) setWho({ id: data.user.id, email: data.user.email ?? null });

      await syncServerSession(supabase);

      // ✅ Redirect: honor ?next=/... if present and safe; else go home
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : "/";
      router.replace(next);
      return;
    } catch (err: any) {
      setMsg(err?.message || "Auth error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (pendingGoogle || busy) return;
    setOauthErr("");
    setMsg("");
    setPendingGoogle(true);
    try {
      const supabase = supabaseBrowser();
      const origin =
        process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ?? window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/me`,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.assign(data.url);
    } catch (err: any) {
      setOauthErr(err?.message || "Could not start Google sign-in.");
    } finally {
      setPendingGoogle(false);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut().catch(() => {});
      // Clear server cookies too so SSR sees signed-out state
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
      setWho(null);
      setMsg("Signed out.");
      router.refresh();
    } catch {
      setMsg("Sign-out error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-app bg-card shadow-2xl">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.15fr_minmax(320px,380px)]">
          <div className="relative bg-gradient-to-br from-[#C8102E] via-[#E63B2E] to-[#F5C518] p-8 text-white lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/80">
              Certified Sliders
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">
              Own your season.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Sign in to manage verified marks, submit results, and follow teammates.
            </p>
          </div>

          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#C8102E] via-[#E63B2E] to-[#F5C518] px-10 py-12 text-white lg:flex">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/70">
                Certified Sliders
              </p>
              <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight">
                Own your season with verified results.
              </h1>
              <p className="mt-4 max-w-sm text-base text-white/80">
                Log marks, climb official rankings, and stay ready for meet day.
              </p>
            </div>
            <ul className="mt-12 space-y-4 text-sm text-white/85">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Submit performances backed by video or meet links.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Track personal bests across every event in one place.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Unlock admin tools for managing athletes and results.</span>
              </li>
            </ul>
          </div>

          <div className="px-6 py-9 sm:px-10 lg:px-12">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                Welcome back
              </p>
              <h2 className="text-3xl font-semibold text-app">
                Sign in to Certified Sliders
              </h2>
              <p className="text-sm text-muted">
                Use Google for a quick sign-in or your email and password below.
              </p>
            </div>

            {who ? (
              <div className="mt-6 rounded-2xl border border-app bg-muted px-4 py-4 text-sm text-app shadow-inner">
                <div>
                  Signed in as <b>{who.email ?? who.id}</b>
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-scarlet px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white hover:text-scarlet"
                  disabled={busy}
                >
                  {busy ? "…" : "Sign out"}
                </button>
              </div>
            ) : null}

            <div className="mt-8 space-y-6">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={pendingGoogle || busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-app bg-card text-sm font-semibold text-app transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                  <span className="text-sm font-bold text-[#4285F4]">G</span>
                </span>
                {pendingGoogle ? "Redirecting…" : "Continue with Google"}
              </button>
              {oauthErr ? (
                <p className="text-sm text-scarlet">{oauthErr}</p>
              ) : null}

              <div className="relative">
                <span className="block h-px w-full bg-muted" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-card px-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                    Or continue with email
                  </span>
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="inline-flex rounded-full bg-muted p-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className={`flex-1 rounded-full px-4 py-1.5 transition ${
                      mode === "signin"
                        ? "bg-card text-app shadow-sm"
                        : "text-muted"
                    }`}
                    disabled={busy}
                  >
                    Email sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`flex-1 rounded-full px-4 py-1.5 transition ${
                      mode === "signup"
                        ? "bg-card text-app shadow-sm"
                        : "text-muted"
                    }`}
                    disabled={busy}
                  >
                    Create account
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-app">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-app bg-card px-4 py-3 text-app shadow-sm outline-none focus:border-scarlet focus:ring-2 focus:ring-scarlet/40"
                    placeholder="you@example.com"
                    required
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-app">Password</label>
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-app bg-card px-4 py-3 text-app shadow-sm outline-none focus:border-scarlet focus:ring-2 focus:ring-scarlet/40"
                    placeholder="Minimum 6 characters"
                    required
                    disabled={busy}
                  />
                </div>

                <button
                  type="submit"
                  className="btn h-12 w-full rounded-full text-base font-semibold disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
                </button>

                <div className="flex items-center justify-between text-sm text-muted">
                  <a href="/reset" className="font-semibold text-scarlet hover:text-scarlet/80">
                    Forgot password?
                  </a>
                  <a href="/" className="hover:text-app">
                    Back to home
                  </a>
                </div>

                {msg ? <p className="text-sm text-scarlet">{msg}</p> : null}
              </form>
            </div>

            <p className="mt-8 text-xs text-muted">
              After signing in, you&apos;ll be redirected back if you came from a protected page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
