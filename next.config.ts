import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Don't run ESLint during builds - we'll handle it separately
    ignoreDuringBuilds: true,
    // Still show warnings but don't fail the build
    dirs: ['src'],
  },
};

export default nextConfig;
