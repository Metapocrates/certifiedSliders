import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Handle OAuth codes at root - redirect to /auth/callback
  // This runs BEFORE any page renders, avoiding PKCE state issues
  if (pathname === "/" && req.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", req.url);
    // Copy all search params
    req.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }

  // Only create Supabase client for protected routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    // Create Supabase client for middleware (Edge-compatible)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect dashboard routes - require authentication
    if (pathname.startsWith("/dashboard")) {
      if (!user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Protect admin routes - require authentication (role check happens in page)
    if (pathname.startsWith("/admin")) {
      if (!user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Match root path for OAuth code handling
    "/",
    // Protected routes
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
