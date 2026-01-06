// src/components/OAuthCodeHandler.tsx
// Handles OAuth codes that arrive at the root URL instead of /auth/callback
"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function OAuthCodeHandler() {
  const handledRef = useRef(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Only handle root path
    if (window.location.pathname !== "/") return;

    // Check for OAuth code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;
    if (handledRef.current) return;
    handledRef.current = true;

    console.log("[OAuthCodeHandler] Detected code at root, processing...");

    // Exchange the code directly here
    const handleOAuthCode = async () => {
      try {
        const supabase = supabaseBrowser();

        // Exchange the code for a session
        console.log("[OAuthCodeHandler] Exchanging code for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[OAuthCodeHandler] Exchange failed:", error.message);
          window.location.href = `/signin?error=${encodeURIComponent(error.message)}`;
          return;
        }

        console.log("[OAuthCodeHandler] Exchange successful, syncing to server...");

        // Sync session to server
        if (data.session) {
          await fetch("/auth/callback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });
        }

        console.log("[OAuthCodeHandler] Redirecting to post-login...");
        // Use href instead of replace to ensure it works
        window.location.href = "/auth/post-login";
      } catch (err) {
        console.error("[OAuthCodeHandler] Error:", err);
        window.location.href = "/signin?error=OAuth%20processing%20failed";
      }
    };

    // Run immediately
    handleOAuthCode();
  }, []);

  return null;
}
