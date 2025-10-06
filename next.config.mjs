// next.config.mjs
/** @type {import('next').NextConfig} */

// Pull the Supabase host from your env so it works across environments
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseHost = "";
try {
  supabaseHost = new URL(supabaseUrl).host; // e.g. sczxkekhouglmvjoukdb.supabase.co
} catch {
  // leave supabaseHost empty if NEXT_PUBLIC_SUPABASE_URL is missing/invalid
}

const nextConfig = {
  images: {
    // Allow exactly your Supabase storage host (avatars, etc.)
    domains: supabaseHost ? [supabaseHost] : [],
    // If you later need broader access, we can switch to remotePatterns.
    // remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },
};

export default nextConfig;
