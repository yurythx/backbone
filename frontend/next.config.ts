import type { NextConfig } from "next";

const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
const isLocalBackend = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(backendURL);

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    reactCompiler: true,
  },
  async rewrites() {
    // Em desenvolvimento local (fora do Docker), 'backend' não resolve.
    // Usamos localhost:8005 como fallback seguro para dev local.
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:8005';
    return [
      {
        source: '/media/:path*',
        destination: `${apiUrl}/media/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8005',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8005',
        pathname: '/media/**',
      },
      // Removemos HTTPS localhost para evitar tentativas de upgrade erradas em dev
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};


export default nextConfig;
