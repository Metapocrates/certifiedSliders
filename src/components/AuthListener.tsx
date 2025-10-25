// src/components/AuthListener.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthListener() {
  const router = useRouter();
  const syncingRef = useRef(false);

  // Keep the set stable
  const EVENTS_TO_SYNC = useRef(
    new Set(["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"])
  );

  const syncServerCookie = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const sb = supabaseBrowser();
      const { data: sessionData } = await sb.auth.getSession();

      // Send tokens so the server can set the HTTP-only cookies for RLS
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: sessionData.session?.access_token ?? null,
          refresh_token: sessionData.session?.refresh_token ?? null,
        }),
      });
      router.refresh();
    } finally {
      setTimeout(() => {
        syncingRef.current = false;
      }, 500);
    }
  }, [router]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event) => {
      if (EVENTS_TO_SYNC.current.has(event)) {
        await syncServerCookie();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, syncServerCookie]);

  return null;
}
