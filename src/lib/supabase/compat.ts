// src/lib/supabase/compat.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
                set(name: string, value: string, options?: any) {
                    try {
                        // Next 14 expects the object overload
                        cookieStore.set({ name, value, ...(options ?? {}) });
                    } catch {
                        // RSC renders can throw on mutating cookies — safe to ignore
                    }
                },
                remove(name: string, options?: any) {
                    try {
                        // Object overload supports path/domain if provided
                        cookieStore.delete({ name, ...(options ?? {}) });
                    } catch {
                        // Safe to ignore in non-mutable contexts
                    }
                },
            },
        }
    );
}