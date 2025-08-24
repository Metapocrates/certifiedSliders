/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // allow any Supabase storage bucket
      },
      {
        protocol: 'https',
        hostname: '**.trackandfieldnews.com', // allow images from T&F News
      },
      {
        protocol: 'https',
        hostname: '**.usatf.org', // allow images from USATF
      },
      {
        protocol: 'https',
        hostname: '**.citiusmag.com', // if you add Citius Mag feed
      },
      {
        protocol: 'https',
        hostname: '**.world-track.org', // if you add World-Track feed
      },
    ],
  },
};

module.exports = nextConfig;
