import type { NextConfig } from "next";

const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
const isLocalBackend = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(backendURL);

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  images: {
    dangerouslyAllowLocalIP: isLocalBackend,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8005',
        pathname: '/media/**',
      },
      {
        // Docker nginx serving media without a port (port 443/https default)
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8005',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
