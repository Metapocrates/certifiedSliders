"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams?.get("type") as string | null;

  const [selectedType, setSelectedType] = useState<string | null>(preselectedType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userTypes = [
    {
      id: "athlete",
      title: "I'm an Athlete",
      description: "Submit results, claim profiles, and connect with coaches",
      icon: "🏃",
    },
    {
      id: "ncaa_coach",
      title: "I'm a College Coach/Program",
      description: "View athletes interested in your NCAA program",
      icon: "🎓",
    },
    {
      id: "parent",
      title: "I'm a Parent/Guardian",
      description: "Manage and support your athlete's profile",
      icon: "👨‍👩‍👧‍👦",
    },
    {
      id: "hs_coach",
      title: "I'm a High School Coach",
      description: "Support and mentor your athletes",
      icon: "📋",
    },
  ];

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

      // Sign up with Supabase Auth
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;

      if (!authData.user) {
        throw new Error("Signup succeeded but no user returned");
      }

      // Set user type via RPC
      const { data: typeResult, error: typeError } = await supabase.rpc("rpc_set_user_type", {
        _user_type: selectedType,
      });

      if (typeError) {
        console.error("Failed to set user type:", typeError);
        // Don't fail the signup, just log it
      }

      // Sync server session
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: authData.session?.access_token ?? null,
          refresh_token: authData.session?.refresh_token ?? null,
        }),
      });

      // Redirect to role-based dashboard
      const roleRoutes: Record<string, string> = {
        athlete: "/dashboard/athlete",
        hs_coach: "/dashboard/hs-coach",
        ncaa_coach: "/dashboard/ncaa-coach",
        parent: "/dashboard/parent",
      };

      const nextRoute = roleRoutes[selectedType] || "/dashboard/athlete";
      router.push(nextRoute);
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
      const supabase = supabaseBrowser();
      const origin = process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ?? window.location.origin;

      const roleRoutes: Record<string, string> = {
        athlete: "/dashboard/athlete",
        hs_coach: "/dashboard/hs-coach",
        ncaa_coach: "/dashboard/ncaa-coach",
        parent: "/dashboard/parent",
      };

      const redirectPath = roleRoutes[selectedType] || "/dashboard/athlete";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${redirectPath}&pending_type=${selectedType}`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || "Google signup failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-app">Create Your Account</h1>
        <p className="text-muted mt-2">
          Choose your account type to get started
        </p>
      </div>

      {/* Type Selection Cards */}
      {!selectedType && (
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {userTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="relative rounded-2xl border-2 border-app/20 bg-card p-6 text-left transition hover:border-scarlet hover:shadow-lg"
            >
              <div className="text-4xl mb-3">{type.icon}</div>
              <h3 className="text-lg font-semibold text-app">{type.title}</h3>
              <p className="text-sm text-muted mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Registration Form */}
      {selectedType && (
        <div className="max-w-md mx-auto">
          <div className="rounded-xl border border-app bg-card p-6 shadow-sm">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <span className="text-2xl">
                  {userTypes.find((t) => t.id === selectedType)?.icon}
                </span>
                <div>
                  <div className="text-xs text-muted">Signing up as</div>
                  <div className="font-semibold text-app">
                    {userTypes.find((t) => t.id === selectedType)?.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedType(null)}
                className="ml-2 text-sm text-scarlet hover:underline"
              >
                Change
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                {error}
              </div>
            )}

            {/* Google Signup */}
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-app bg-card text-sm font-semibold text-app transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 mb-4"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-sm font-bold text-[#4285F4]">G</span>
              </span>
              {loading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="relative mb-4">
              <span className="block h-px w-full bg-muted" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-card px-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                  Or
                </span>
              </span>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-app bg-card px-4 py-3 text-app shadow-sm outline-none focus:border-scarlet focus:ring-2 focus:ring-scarlet/40 disabled:opacity-60"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-app bg-card px-4 py-3 text-app shadow-sm outline-none focus:border-scarlet focus:ring-2 focus:ring-scarlet/40 disabled:opacity-60"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-scarlet text-white font-semibold transition hover:bg-scarlet/90 disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-scarlet hover:underline font-semibold">
                Sign in
              </a>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
