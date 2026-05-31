import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Дозволяє Next.js коректно обробляти внутрішні модулі Three.js на сервері та клієнті
  transpilePackages: ['three'],
  /* інші налаштування конфігу */
};

export default nextConfig;