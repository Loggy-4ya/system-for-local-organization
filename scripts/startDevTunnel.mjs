#!/usr/bin/env node
/**
 * @fileoverview Start host ngrok, sync NEXTAUTH_URL, recreate the web container.
 *
 * Run: npm run dev:tunnel
 */

import { existsSync } from "node:fs";
import {
  envPath,
  loadEnvFile,
  normalizeNgrokStaticDomain,
  resolveActivePublicUrl,
  startHostNgrok,
  stopHostNgrok,
  sleep,
  run,
  defaultLocalPort,
  resolveNgrokBinary,
  syncNextAuthUrl,
  staticDomainToPublicUrl,
  probeNexusPublicUrl,
} from "./ngrokDevLib.mjs";

if (!existsSync(envPath)) {
  console.error("Missing .env.local — run: cp .env.vps.example .env.local");
  process.exit(1);
}

const env = loadEnvFile(envPath);
const authtoken = env.NGROK_AUTHTOKEN?.trim();
const staticDomain = normalizeNgrokStaticDomain(env.NGROK_STATIC_DOMAIN);
const localPort = env.NGROK_LOCAL_PORT?.trim() || defaultLocalPort;

if (!authtoken) {
  console.error(`
NGROK_AUTHTOKEN is missing in .env.local.

1. https://dashboard.ngrok.com/get-started/your-authtoken
2. Add NGROK_AUTHTOKEN=... to .env.local
3. npm run dev:tunnel:setup && npm run dev:tunnel
`);
  process.exit(1);
}

if (authtoken.startsWith("ep_")) {
  console.error("NGROK_AUTHTOKEN is an endpoint token (ep_…). Use the agent Authtoken from ngrok dashboard.");
  process.exit(1);
}

try {
  resolveNgrokBinary();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

let publicUrl = await resolveActivePublicUrl(staticDomain);

if (publicUrl) {
  console.log(`Using active tunnel: ${publicUrl}`);
} else {
  console.log(
    staticDomain
      ? `Starting host ngrok → https://${staticDomain} → localhost:${localPort}`
      : `Starting host ngrok → localhost:${localPort}`,
  );

  try {
    const pid = startHostNgrok({ authtoken, staticDomain, localPort });
    console.log(`ngrok pid ${pid} (stop: npm run dev:tunnel:stop)`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    publicUrl = await resolveActivePublicUrl(staticDomain);
    if (publicUrl) break;
    sleep(1000);
  }

  if (!publicUrl && staticDomain) {
    console.warn("\nLocal ngrok agent did not connect. Run: npm run dev:tunnel:doctor");
    publicUrl = staticDomainToPublicUrl(staticDomain);
    console.warn(`Will sync NEXTAUTH_URL to ${publicUrl} but tunnel may not reach Nexus yet.`);
  }

  if (!publicUrl) {
    console.error(
      "Could not resolve a public HTTPS URL. Run: /snap/bin/ngrok http 8080 --url https://YOUR-DOMAIN.ngrok-free.dev",
    );
    stopHostNgrok();
    process.exit(1);
  }
}

const synced = syncNextAuthUrl(publicUrl);
console.log(`Synced NEXTAUTH_URL=${synced}`);
console.log("\nRegister once in Google Console + @BotFather /setdomain:");
console.log(`  Origin: ${synced}`);
console.log(`  Redirect: ${synced}/api/auth/callback/google`);
console.log(`  BotFather domain: ${new URL(synced).hostname}`);
console.log(`\nOpen: ${synced}/login`);

run("docker", ["compose", "up", "-d", "--force-recreate", "web"]);

if (!(await probeNexusPublicUrl(synced))) {
  console.error("\n✗ The ngrok URL does not reach Nexus yet (placeholder page or agent offline).");
  console.error("Run: npm run dev:tunnel:doctor");
  process.exit(1);
}

console.log("\nDone. Browse the ngrok HTTPS URL above — not the LAN IP.");
