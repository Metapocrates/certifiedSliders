// No top-level server-only imports here.

// Client helper — safe in Client Components
export function createSupabaseBrowser() {
    const { createClientComponentClient } = require("@supabase/auth-helpers-nextjs");
    return createClientComponentClient();
}

// Server helper — safe in Server Components / route handlers
export function createSupabaseServer() {
    const { cookies } = require("next/headers");
    const { createServerComponentClient } = require("@supabase/auth-helpers-nextjs");
    return createServerComponentClient({ cookies });
}
