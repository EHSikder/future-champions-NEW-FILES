/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent ESLint errors from failing the Vercel build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Prevent TypeScript errors from failing the Vercel build
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/predictions',
        destination: '/matches',
      },
    ];
  },
};

export default nextConfig;