/** @type {import('next').NextConfig} */
const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];
export default {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }],
  },
  // το 3D παιχνίδι είναι στατικά αρχεία στο public/game/xmas
  async rewrites() { return [{ source: '/game/xmas', destination: '/game/xmas/index.html' }, { source: '/xmas3d', destination: '/game/xmas/index.html' }]; },
  // ο παλιός οδηγός email είναι πλέον επεξεργάσιμος από τους «Οδηγούς βοήθειας»
  async redirects() { return [{ source: '/email-help', destination: '/help/email-help', permanent: false }]; },
  async headers() { return [{ source: '/:path*', headers: security }]; },
  webpack(config) {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};
