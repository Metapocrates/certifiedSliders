import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Server-scoped Supabase client for App Router */
export async function supabaseServer() {
    const cookieStore = await cookies();

    const get = (name: string) => cookieStore.get(name)?.value;
    const set = (name: string, value: string, options: CookieOptions) => {
        try {
            cookieStore.set({ name, value, ...options });
        } catch {
            // In some RSC contexts cookies can be readonly; ignore
        }
    };
    const remove = (name: string, options: CookieOptions) => {
        try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
            // ignore
        }
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

    return createServerClient(url, anon, { cookies: { get, set, remove } });
}
