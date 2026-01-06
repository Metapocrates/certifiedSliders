// src/components/OAuthCodeHandler.tsx
// Handles OAuth codes that arrive at the root URL instead of /auth/callback
// This is a workaround for when Supabase redirect URLs aren't configured correctly
"use client";

import { useEffect } from "react";

export default function OAuthCodeHandler() {
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Only handle root path
    if (window.location.pathname !== "/") return;

    // Check for OAuth code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Redirect to callback handler with all params
      const callbackUrl = `/auth/callback${window.location.search}`;
      window.location.replace(callbackUrl);
    }
  }, []);

  return null;
}
