'use client';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Optional: add your typed Database import here if you generated types.
// import type { Database } from './types';

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    // If either env var is missing, fail loudly to help debugging:
    if (!url || !anon) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    return createSupabaseClient(/*<Database>*/ url, anon, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    });
}
