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

const remotePatterns = [];
if (supabaseHost) {
  remotePatterns.push({ protocol: "https", hostname: supabaseHost });
}
remotePatterns.push({ protocol: "https", hostname: "picsum.photos" });

const nextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
