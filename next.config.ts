import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    '.space-z.ai',
    'localhost',
    '127.0.0.1',
    'preview-chat-97053e79-71b4-490a-8a58-4099a2204c3d.space-z.ai',
  ],
};

export default nextConfig;
