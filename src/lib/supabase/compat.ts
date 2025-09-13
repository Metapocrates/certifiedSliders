// src/lib/supabase/compat.ts
import { cookies } from "next/headers";
import {
    createClientComponentClient,
    createServerComponentClient,
    createRouteHandlerClient,
    // NOTE: do NOT import createServerActionClient on Next 15 — not needed
} from "@supabase/auth-helpers-nextjs";

// Server components/pages
export function createSupabaseServer() {
    return createServerComponentClient({ cookies } as any);
}

// Route handlers (GET/POST in app/api/*)
export function createSupabaseRoute() {
    return createRouteHandlerClient({ cookies } as any);
}

// Client components (use in "use client" files)
export function createSupabaseBrowser() {
    return createClientComponentClient();
}
