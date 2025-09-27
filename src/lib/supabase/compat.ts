// src/lib/supabase/compat.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Use in Server Components / Layouts / Pages that render on the server.
 * Read cookies; do NOT attempt to write (Next.js disallows write here).
 * Supabase session refreshes that try to set cookies will safely no-op.
 */
export function createSupabaseServer() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // In Server Components, Next.js disallows cookies().set/remove.
                    // Swallow writes to avoid runtime errors; real writes happen in Server Actions/Route Handlers.
                    try {
                        // @ts-ignore - best effort; will throw in RSC which is fine
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        /* no-op in Server Components */
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        // @ts-ignore
                        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
                    } catch {
                        /* no-op in Server Components */
                    }
                },
            },
        }
    );
}

/**
 * (Optional) If you need read-write cookies (e.g., in a Route Handler or Server Action),
 * import and use this variant instead.
 */
export function createSupabaseServerWritable() {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: "", ...options, maxAge: 0 });
                },
            },
        }
    );
}
