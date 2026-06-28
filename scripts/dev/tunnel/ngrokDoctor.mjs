#!/usr/bin/env node
/**
 * @fileoverview Diagnose ngrok + OAuth dev setup issues.
 *
 * Run: npm run dev:tunnel:doctor
 */

import { existsSync } from "node:fs";
import {
  envPath,
  loadEnvFile,
  normalizeNgrokStaticDomain,
  staticDomainToPublicUrl,
  probeNexusPublicUrl,
  resolveNgrokBinary,
} from "./ngrokDevLib.mjs";

/** @param {boolean} ok @param {string} label @param {string} detail */
function line(ok, label, detail) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = loadEnvFile(envPath);
const staticDomain = normalizeNgrokStaticDomain(env.NGROK_STATIC_DOMAIN);
const publicUrl = staticDomain ? staticDomainToPublicUrl(staticDomain) : env.NEXTAUTH_URL?.trim();

console.log("Nexus dev tunnel doctor\n");

try {
  resolveNgrokBinary();
  line(true, "ngrok binary", "found on PATH or /snap/bin/ngrok");
} catch (err) {
  line(false, "ngrok binary", err instanceof Error ? err.message : "missing");
}

line(Boolean(env.NGROK_AUTHTOKEN), "NGROK_AUTHTOKEN", env.NGROK_AUTHTOKEN ? "set" : "missing");
line(Boolean(staticDomain), "NGROK_STATIC_DOMAIN", staticDomain ?? "missing");

if (env.NEXTAUTH_URL?.includes("https:/") && !env.NEXTAUTH_URL?.includes("https://")) {
  line(false, "NEXTAUTH_URL format", `broken URL: ${env.NEXTAUTH_URL} — run npm run dev:tunnel`);
}

if (!publicUrl) {
  console.log("\nSet NGROK_STATIC_DOMAIN or NEXTAUTH_URL, then re-run.");
  process.exit(1);
}

console.log(`\nProbing ${publicUrl}/login …`);

try {
  const res = await fetch(`${publicUrl}/login`, { redirect: "follow", signal: AbortSignal.timeout(10000) });
  const html = await res.text();

  if (/Your new ngrok Cloud Endpoint!/i.test(html)) {
    line(false, "Tunnel forwards to Nexus", "ngrok Cloud Endpoint placeholder — agent NOT connected");
    console.log(`
Fix (pick one):

  A) Connect your local agent to the reserved domain (keep terminal open):
     /snap/bin/ngrok http 8080 --url ${publicUrl}

     If you see ERR_NGROK_334, open the ngrok dashboard and delete/stop the
     orphaned cloud endpoint first:
     https://dashboard.ngrok.com/endpoints

  B) Use a fresh ephemeral URL (no static domain):
     /snap/bin/ngrok http 8080
     npm run dev:tunnel:sync
     docker compose up -d --force-recreate web
     Re-register the new URL in Google Console + @BotFather /setdomain

  C) In ngrok dashboard → Cloud Endpoint → Traffic Policy:
     ensure the endpoint forwards to your agent (not the default placeholder).
`);
    process.exit(1);
  }

  const nexusOk = await probeNexusPublicUrl(publicUrl);
  line(nexusOk, "Tunnel forwards to Nexus", nexusOk ? "login page OK" : "unexpected response");

  if (nexusOk) {
    console.log(`\nOpen: ${publicUrl}/login`);
    console.log(`BotFather /setdomain → ${new URL(publicUrl).hostname}`);
    console.log(`Google origin → ${publicUrl}`);
  }
} catch (err) {
  line(false, "Tunnel reachable", err instanceof Error ? err.message : "fetch failed");
  console.log("\nStart ngrok: /snap/bin/ngrok http 8080 --url " + publicUrl);
  process.exit(1);
}

line(Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), "Google OAuth env", "GOOGLE_CLIENT_ID + SECRET");
line(Boolean(env.TELEGRAM_BOT_TOKEN && env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME), "Telegram env", "bot token + username");

console.log("\nLocal app: curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login");
try {
  const local = await fetch("http://localhost:8080/login", { signal: AbortSignal.timeout(5000) });
  line(local.ok, "Docker web on :8080", String(local.status));
} catch {
  line(false, "Docker web on :8080", "not reachable — run docker compose up");
}
