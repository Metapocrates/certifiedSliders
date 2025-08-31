// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// If you have generated DB types, you can do: createServerClient<Database>(...)
export function createClient() {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    // In App Router, you can’t set during render; noop is fine for read-only usage.
                },
                remove(name: string, options: any) {
                    // Same as above.
                },
            },
        }
    );
}
export { createClient as createSupabaseServer };
