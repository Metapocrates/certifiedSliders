// src/components/OAuthCodeHandler.tsx
// Handles OAuth codes that arrive at the root URL instead of /auth/callback
// Exchanges the code directly instead of redirecting to avoid PKCE state issues
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

    if (code && !handledRef.current) {
      handledRef.current = true;

      // Exchange the code directly here
      const handleOAuthCode = async () => {
        try {
          const supabase = supabaseBrowser();

          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("OAuth code exchange failed:", error.message);
            // Redirect to signin with error
            window.location.replace(`/signin?error=${encodeURIComponent(error.message)}`);
            return;
          }

          // Sync session to server
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            await fetch("/auth/callback", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
              }),
            });
          }

          // Clear the code from URL and redirect to post-login
          window.location.replace("/auth/post-login");
        } catch (err) {
          console.error("OAuth handling error:", err);
          window.location.replace("/signin?error=OAuth%20failed");
        }
      };

      handleOAuthCode();
    }
  }, []);

  return null;
}
