import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Дозволяє Next.js коректно обробляти внутрішні модулі Three.js на сервері та клієнті
  transpilePackages: ['three'],
  /* інші налаштування конфігу */

  // Hostnames only — no protocol or port (required for LAN access during dev)
  allowedDevOrigins: ['192.168.50.10'],
};

export default nextConfig;