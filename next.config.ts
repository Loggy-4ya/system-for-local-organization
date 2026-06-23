import type { NextConfig } from "next";
import path from "path";

/** Hostname from NEXTAUTH_URL — enables phone/LAN access in `next dev`. */
function resolveDevLanOrigin(): string | undefined {
  const authUrl = process.env.NEXTAUTH_URL;
  if (!authUrl) return undefined;
  try {
    const host = new URL(authUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" ? undefined : host;
  } catch {
    return undefined;
  }
}

/**
 * Extra dev hostnames (comma-separated) for LAN testing while `NEXTAUTH_URL` stays on ngrok.
 * Example: `NEXUS_DEV_ALLOWED_ORIGINS=192.168.50.10` — find IP via `hostname -I`.
 */
function resolveExtraDevOrigins(): string[] {
  const raw = process.env.NEXUS_DEV_ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== "localhost" && entry !== "127.0.0.1");
}

const devLanOrigin = resolveDevLanOrigin();
const extraDevOrigins = resolveExtraDevOrigins();

const nextConfig: NextConfig = {
  // Enable standalone output for the production Docker image
  output: "standalone",

  // Phone/LAN testing: Next.js 16 blocks dev assets from non-localhost origins unless listed.
  allowedDevOrigins: [
    ...(devLanOrigin ? [devLanOrigin] : []),
    ...extraDevOrigins,
    "localhost",
    "127.0.0.1",
  ],

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
