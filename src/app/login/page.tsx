"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/browser";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

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

  // Redirect if already logged in
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const nextParam = new URLSearchParams(window.location.search).get("next");
        const postLoginUrl = nextParam
          ? `/auth/post-login?next=${encodeURIComponent(nextParam)}`
          : "/auth/post-login";
        router.replace(postLoginUrl);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setMsg("");
    setBusy(true);

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await syncServerSession(supabase);

      const nextParam = new URLSearchParams(window.location.search).get("next");
      const postLoginUrl = nextParam
        ? `/auth/post-login?next=${encodeURIComponent(nextParam)}`
        : "/auth/post-login";
      router.replace(postLoginUrl);
      return;
    } catch (err: any) {
      setMsg(err?.message || "Auth error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (busy) return;
    setBusy(true);
    setMsg("");

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.redirected) {
        return;
      }

      // Session set — redirect to post-login
      window.location.href = "/auth/post-login";
    } catch (err: any) {
      setMsg(err?.message || "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.15fr_minmax(320px,400px)]">
          {/* Left brand panel - mobile */}
          <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-white lg:hidden">
            <p className="font-display text-xs uppercase tracking-[0.4em] text-white/80">
              Certified Sliders
            </p>
            <h1 className="mt-4 font-display text-3xl leading-tight">
              ARE YOU A SLIDER?
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Sign in to manage verified marks, submit results, and follow other athletes.
            </p>
          </div>

          {/* Left brand panel - desktop */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent px-10 py-12 text-white lg:flex">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.45em] text-white/70">
                Certified Sliders
              </p>
              <h1 className="mt-6 max-w-sm font-display text-4xl leading-tight">
                CERTIFIED RESULTS. CERTIFIED RATINGS.
              </h1>
              <p className="mt-4 max-w-sm text-base text-white/80">
                Create your account, claim your profile, and post your PRs!
              </p>
            </div>
            <ul className="mt-12 space-y-4 text-sm text-white/85">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Submit performances backed by video or meet links.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Easily share your PRs with athletes and coaches.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-white/80" />
                <span>Built exclusively for high school track and field!</span>
              </li>
            </ul>
          </div>

          {/* Right form panel */}
          <div className="px-6 py-9 sm:px-10 lg:px-12">
            <div className="space-y-2">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Welcome back
              </p>
              <h2 className="font-display text-3xl text-foreground">
                SIGN IN
              </h2>
              <p className="text-sm text-muted-foreground">
                Use Google for a quick sign-in or enter your email below.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {busy ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="relative">
                <span className="block h-px w-full bg-border" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Or use email
                  </span>
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="you@example.com"
                    required
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="Your password"
                    required
                    disabled={busy}
                  />
                </div>

                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Signing in…" : "Sign In"}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <a href="/reset" className="font-semibold text-primary hover:text-primary/80">
                    Forgot password?
                  </a>
                  <a href="/register" className="font-semibold text-primary hover:text-primary/80">
                    Create account
                  </a>
                </div>

                {msg ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{msg}</p> : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
