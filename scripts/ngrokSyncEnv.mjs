#!/usr/bin/env node
/**
 * @fileoverview Sync NEXTAUTH_URL from ngrok inspector or static domain probe.
 *
 * Run: npm run dev:tunnel:sync
 */

import { existsSync } from "node:fs";
import {
  envPath,
  loadEnvFile,
  normalizeNgrokStaticDomain,
  resolveActivePublicUrl,
  syncNextAuthUrl,
  staticDomainToPublicUrl,
} from "./ngrokDevLib.mjs";

if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = loadEnvFile(envPath);
const staticDomain = normalizeNgrokStaticDomain(env.NGROK_STATIC_DOMAIN);

let publicUrl = await resolveActivePublicUrl(staticDomain);
if (!publicUrl && staticDomain) {
  publicUrl = staticDomainToPublicUrl(staticDomain);
}

if (!publicUrl) {
  console.error("No tunnel found. Start ngrok or check NGROK_STATIC_DOMAIN.");
  process.exit(1);
}

const synced = syncNextAuthUrl(publicUrl);
console.log(`Synced NEXTAUTH_URL=${synced}`);
console.log(`Open: ${synced}/login`);
console.log("Run: docker compose up -d --force-recreate web");
