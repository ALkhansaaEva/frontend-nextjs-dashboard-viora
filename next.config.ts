import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000', '3001', '3002', '3003', '3004', '3005', '192.168.83.1'],
  output: 'standalone', // ponytail: enables Docker multi-stage - smallest prod image

  // ponytail: CSP — allow all images/media, block framing only
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' http://localhost:* https: data: blob:; img-src * data: blob:; media-src * http://localhost:* https:; font-src * data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'none'; object-src 'none'"
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
