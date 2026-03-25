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
  devIndicators: {
    position: 'bottom-right',
  },
  // Force cache busting: ensure browsers always get fresh JS bundles
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
  ],
};

export default nextConfig;
