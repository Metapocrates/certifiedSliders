// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Creates a Supabase client that works in Next.js Server Components.
 */
export function supabaseServer() {
    const cookieStore = cookies();

    const get = (name: string) => cookieStore.get(name)?.value;
    const set = (name: string, value: string, options: CookieOptions) => {
        try {
            cookieStore.set({ name, value, ...options });
        } catch {
            // In RSC, cookies may be readonly; ignore errors
        }
    };
    const remove = (name: string, options: CookieOptions) => {
        try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
            // noop
        }
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY envs");

    return createServerClient(url, anon, { cookies: { get, set, remove } });
}
