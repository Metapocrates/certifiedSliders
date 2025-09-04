// src/lib/supabase/compat.ts
import { cookies } from "next/headers";
import {
    createClientComponentClient,
    createServerActionClient,
    createServerComponentClient,
    createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";

// Server components / pages
export function createSupabaseServer() {
    return createServerComponentClient({ cookies });
}

// Server actions (form actions)
export function createSupabaseAction() {
    return createServerActionClient({ cookies });
}

// Route handlers (app/api/*)
export function createSupabaseRoute() {
    return createRouteHandlerClient({ cookies });
}

// Client components
export function createSupabaseClient() {
    return createClientComponentClient();
}
