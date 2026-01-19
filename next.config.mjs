/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'zsvisvrmfssxkytuiuun.supabase.co',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
