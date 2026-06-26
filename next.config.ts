import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['face-api.js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
