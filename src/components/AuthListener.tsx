"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event) => {
        // Ensure server cookies are updated on any auth change
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFREShed".toUpperCase()) {
          await fetch("/auth/callback", { method: "POST" });
          router.refresh();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
