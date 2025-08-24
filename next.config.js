/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // allow any Supabase project storage domain
      },
    ],
  },
};

module.exports = nextConfig;
