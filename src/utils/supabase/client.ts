"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/types/supabase"; // if you generated types

// One browser client singleton
const client = createClientComponentClient(/*<Database>*/);

export const supabaseBrowser = client;

// Back-compat
export function createClient() {
    return client;
}
