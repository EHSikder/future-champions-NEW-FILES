/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      // Redirect old /predictions path to /matches
      {
        source: '/predictions',
        destination: '/matches',
      },
    ];
  },
};

export default nextConfig;
