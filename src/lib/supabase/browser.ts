// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL;
    const anon =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anon) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
    return createBrowserClient(url, anon);
}
