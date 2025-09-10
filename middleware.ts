import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Keep Supabase auth cookies in sync during navigation */
export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => req.cookies.get(name)?.value,
                set: (name, value, options) => {
                    res.cookies.set({ name, value, ...options });
                },
                remove: (name, options) => {
                    res.cookies.set({ name, value: "", ...options, maxAge: 0 });
                },
            },
        }
    );

    // Touch session so refresh tokens can rotate & cookies propagate
    await supabase.auth.getSession();

    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
