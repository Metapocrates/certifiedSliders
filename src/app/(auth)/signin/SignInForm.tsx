"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SignInForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/me");      // navigate
        router.refresh();        // force server to see new cookie
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMsg("Check your email to confirm your account.");
        } else {
          router.push("/me");
          router.refresh();
        }
      }
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <div className="mb-4 flex gap-2">
        <button type="button" className={`btn ${mode === "signin" ? "" : "opacity-60"}`} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" className={`btn ${mode === "signup" ? "" : "opacity-60"}`} onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" className="input" placeholder="you@example.com" required />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" className="input" placeholder="••••••••" required />
        </label>

        <button type="submit" disabled={busy} className="btn">
          {busy ? (mode === "signin" ? "Signing in..." : "Creating...") : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {msg && <div className="text-sm mt-1">{msg}</div>}
      </form>
    </div>
  );
}
