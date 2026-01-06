"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

type Mode = "password" | "magic";

export default function SignInPage() {
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      if (data?.user) {
        // Already logged in, redirect to post-login handler
        router.replace("/auth/post-login");
      }
    };
    checkSession();
  }, [router]);

  // shared
  const [mode, setMode] = useState<Mode>("password");
  const [err, setErr] = useState<string | null>(null);

  // password mode
  const [emailPw, setEmailPw] = useState("");
  const [password, setPassword] = useState("");
  const [pendingPw, setPendingPw] = useState(false);

  // magic link mode
  const [emailMagic, setEmailMagic] = useState("");
  const [sentMagic, setSentMagic] = useState(false);
  const [pendingMagic, setPendingMagic] = useState(false);

  // forgot password (hidden by default)
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [resetErr, setResetErr] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setErr(null);
  }

  async function onGoogleSignIn() {
    setErr(null);
    try {
      // Use window.location.origin directly for client-side to ensure correct redirect in dev
      const origin = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || "";

      const { data, error} = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/auth/post-login`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.assign(data.url);
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed.");
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPendingPw(true);
    try {
      // Sign in only (signup redirects to /register)
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: emailPw,
        password,
      });

      if (error) throw error;

      // Sync session to server cookies
      if (data?.session) {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
      }

      // Navigate to post-login handler which will redirect to appropriate dashboard
      window.location.href = "/auth/post-login";
    } catch (e: any) {
      setErr(e?.message ?? "Sign-in failed.");
    } finally {
      setPendingPw(false);
    }
  }

  async function onSubmitMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPendingMagic(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: emailMagic,
        options: { emailRedirectTo: `${window.location.origin}/me` },
      });
      if (error) throw error;
      setSentMagic(true);
    } catch (e: any) {
      setErr(e?.message ?? "Couldn’t send magic link.");
    } finally {
      setPendingMagic(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetErr(null);
    setPendingReset(true);
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (e: any) {
      setResetErr(e?.message ?? "Couldn’t send reset email.");
    } finally {
      setPendingReset(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

      <div className="space-y-4 mb-8">
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
        >
          Sign in with Google
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-px flex-1 bg-gray-300" aria-hidden="true" />
          <span>or</span>
          <span className="h-px flex-1 bg-gray-300" aria-hidden="true" />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex gap-2">
        <button
          className={`px-3 py-1.5 border rounded ${mode === "password" ? "bg-black text-app" : ""}`}
          onClick={() => switchMode("password")}
        >
          Email & Password
        </button>
        <button
          className={`px-3 py-1.5 border rounded ${mode === "magic" ? "bg-black text-app" : ""}`}
          onClick={() => switchMode("magic")}
        >
          Magic Link
        </button>
      </div>

      {mode === "password" ? (
        <>
          {/* Sign in / Sign up */}
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Sign in</h2>
              <a
                href="/register"
                className="text-sm text-scarlet hover:underline font-semibold"
              >
                New here? Create account →
              </a>
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={emailPw}
                onChange={(e) => setEmailPw(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="••••••••"
              />
            </div>

            <button
              disabled={pendingPw}
              className="rounded-md px-4 py-2 bg-black text-app w-full"
            >
              {pendingPw ? "Working…" : "Sign in"}
            </button>

            <div className="text-right">
              <button
                type="button"
                className="text-sm underline underline-offset-2"
                onClick={() => {
                  setShowReset((s) => !s);
                  setResetErr(null);
                }}
              >
                {showReset ? "Hide reset" : "Forgot password?"}
              </button>
            </div>
          </form>

          {/* Reset password (hidden until toggled) */}
          {showReset ? (
            <form onSubmit={onResetPassword} className="mt-6 space-y-4 border rounded-md p-4">
              <h3 className="text-base font-medium">Reset password</h3>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="you@example.com"
                />
              </div>
              <button
                disabled={pendingReset}
                className="rounded-md px-4 py-2 border w-full"
              >
                {pendingReset ? "Sending…" : "Send reset link"}
              </button>
              {resetSent ? (
                <div className="text-sm text-emerald-700">
                  Reset link sent. Check your email.
                </div>
              ) : null}
              {resetErr ? <div className="text-sm text-red-600">{resetErr}</div> : null}
            </form>
          ) : null}
        </>
      ) : (
        // Magic link mode
        <form onSubmit={onSubmitMagic} className="space-y-4">
          <h2 className="text-lg font-medium">Email me a magic sign-in link</h2>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={emailMagic}
              onChange={(e) => setEmailMagic(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="you@example.com"
            />
          </div>
          <button
            disabled={pendingMagic}
            className="rounded-md px-4 py-2 bg-black text-app w-full"
          >
            {pendingMagic ? "Sending…" : "Send magic link"}
          </button>
          {sentMagic ? (
            <div className="text-sm text-emerald-700">Check your email for the link.</div>
          ) : null}
        </form>
      )}

      {err ? <div className="mt-6 text-sm text-red-600">{err}</div> : null}
    </div>
  );
}
