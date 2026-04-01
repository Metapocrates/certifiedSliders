"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";


const userTypes = [
  {
    id: "athlete",
    title: "Athlete",
    description: "Submit results, claim profiles, and connect with coaches",
    icon: "🏃",
    route: "/me",
  },
  {
    id: "ncaa_coach",
    title: "College Coach",
    description: "Search verified athletes and build recruiting lists",
    icon: "🎓",
    route: "/coach/onboarding",
  },
  {
    id: "parent",
    title: "Parent / Guardian",
    description: "Support your athlete and submit results on their behalf",
    icon: "👨‍👩‍👧‍👦",
    route: "/parent/onboarding",
  },
  {
    id: "hs_coach",
    title: "HS Coach",
    description: "Manage your roster and attest results",
    icon: "📋",
    route: "/hs/portal",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams?.get("type") as string | null;

  const [selectedType, setSelectedType] = useState<string | null>(preselectedType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedInfo = userTypes.find((t) => t.id === selectedType);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) {
      setError("Please select your account type");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = supabaseBrowser();
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("Signup succeeded but no user returned");

      // Set user type via RPC
      const { error: typeError } = await supabase.rpc("rpc_set_user_type", { _user_type: selectedType });
      if (typeError) console.error("Failed to set user type:", typeError);

      // Sync server session
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: authData.session?.access_token ?? null,
          refresh_token: authData.session?.refresh_token ?? null,
        }),
      });

      const route = selectedInfo?.route || "/me";
      window.location.href = route;
    } catch (err: any) {
      setError(err?.message || "Signup failed");
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    if (!selectedType) {
      setError("Please select your account type first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
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
      setError(err?.message || "Google signup failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-foreground">CREATE YOUR ACCOUNT</h1>
        <p className="mt-2 text-muted-foreground">
          Choose your account type to get started
        </p>
      </div>

      {/* Type Selection */}
      {!selectedType && (
        <div className="grid gap-4 md:grid-cols-2">
          {userTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="rounded-xl border-2 border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-lg"
            >
              <div className="mb-3 text-4xl">{type.icon}</div>
              <h3 className="font-display text-lg text-foreground">{type.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Registration Form */}
      {selectedType && selectedInfo && (
        <div className="mx-auto max-w-md">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <span className="text-2xl">{selectedInfo.icon}</span>
                <div>
                  <div className="text-xs text-muted-foreground">Signing up as</div>
                  <div className="font-semibold text-foreground">{selectedInfo.title}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Change
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Google Signup */}
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 mb-4"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="relative mb-4">
              <span className="block h-px w-full bg-border" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Or
                </span>
              </span>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-primary font-bold uppercase tracking-wide text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
