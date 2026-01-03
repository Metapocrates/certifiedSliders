"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // Use the singleton browser client to avoid multiple GoTrueClient instances
      const supabase = supabaseBrowser();

      // 1) Clear client session (localStorage) with local scope
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

      // 2) Clear server cookies
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});

      // 3) Redirect + refresh so the header re-evaluates auth state
      router.replace("/");
      router.refresh();
    };
    run();
  }, [router]);

  return <div className="container py-10 text-sm opacity-70">Signing you out…</div>;
}
