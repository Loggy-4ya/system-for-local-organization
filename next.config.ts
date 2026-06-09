import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for the production Docker image
  output: "standalone",

  // Allow remote image sources for user avatars (Google, Telegram CDN)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "t.me" },
    ],
  },

  // Turbopack is the default bundler in Next.js 16 — resolve @shared/* here
  // (tsconfig paths are also read, but this mirrors the former webpack alias)
  turbopack: {
    resolveAlias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
};

export default nextConfig;
