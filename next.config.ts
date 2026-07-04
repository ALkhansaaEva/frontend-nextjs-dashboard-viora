import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000', '3001', '3002', '3003', '3004', '3005', '192.168.83.1'],
  output: 'standalone', // ponytail: enables Docker multi-stage — smallest prod image

  // ponytail: permissive CSP — media/images loaded cross-origin from evaka.store
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https://evaka.store https://dev.evaka.store https://picsum.photos; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://evaka.store https://dev.evaka.store; " +
              "media-src 'self' https://evaka.store; " +
              "frame-src 'none'; " +
              "object-src 'none'",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
