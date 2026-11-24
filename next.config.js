/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  async headers() {
    return [{source: '/:locale(en|es)/staff-invite', headers: [
      {key: 'Referrer-Policy', value: 'no-referrer'},
      {key: 'Cache-Control', value: 'private, no-store, max-age=0'},
      {key: 'X-Robots-Tag', value: 'noindex, nofollow'},
    ]}];
  },
};

module.exports = nextConfig;
