"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/types/supabase"; // if you generated types

// Create ONE browser client up front.
const client = createClientComponentClient(/*<Database>*/);

/** Preferred import for new code */
export const supabaseBrowser = client;

/** Back-compat: old code can still call createClient(), but this returns the singleton. */
export function createClient() {
    return client;
}
