// src/lib/supabase/compat.ts
// Guarantees we return either a Supabase client or call a factory to get one.
// Never returns the raw module object.

let _factoryOrClient: any;

try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("./server");
    _factoryOrClient = mod?.default ?? mod?.supabaseServer ?? null;
} catch {
    _factoryOrClient = null;
}

if (!_factoryOrClient) {
    throw new Error(
        'Supabase server helper not found. Export either "default" or named "supabaseServer" from src/lib/supabase/server.ts'
    );
}

export function createSupabaseServer() {
    const client = typeof _factoryOrClient === "function" ? _factoryOrClient() : _factoryOrClient;

    // Guard: ensure we actually have a client with .auth
    if (!client || typeof client !== "object" || !("auth" in client)) {
        throw new Error(
            "createSupabaseServer(): resolved value is not a Supabase client. Check your export shape in src/lib/supabase/server.ts"
        );
    }
    return client;
}
