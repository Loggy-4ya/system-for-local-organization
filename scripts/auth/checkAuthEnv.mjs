#!/usr/bin/env node
/**
 * @fileoverview Validate OAuth / Telegram env vars for local auth testing.
 *
 * Run: npm run auth:check-env
 * Reads `.env.local` from the repo root (does not print secret values).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { findRepoRoot } from "../lib/repoRoot.mjs";

const root = findRepoRoot(import.meta.url);
const envPath = resolve(root, ".env.local");

/** @param {string} path */
function loadEnvFile(path) {
  /** @type {Record<string, string>} */
  const env = {};
  if (!existsSync(path)) return env;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

/** @param {string | undefined} value */
function isPlaceholder(value) {
  if (!value) return true;
  return /generate-a-random|change_me|your_secure|here$/i.test(value);
}

/** @param {string} label @param {boolean} ok @param {string} detail */
function line(label, ok, detail) {
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
}

const env = loadEnvFile(envPath);

if (!existsSync(envPath)) {
  console.error("Missing .env.local — run: npm run env:init");
  process.exit(1);
}

const nextAuthUrl = env.NEXTAUTH_URL ?? "";
const googleId = env.GOOGLE_CLIENT_ID ?? "";
const googleSecret = env.GOOGLE_CLIENT_SECRET ?? "";
const botToken = env.TELEGRAM_BOT_TOKEN ?? "";
const botUsername = (env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").trim().replace(/^@+/, "");

console.log(`Auth env check (${envPath})\n`);

line("NEXTAUTH_URL", Boolean(nextAuthUrl) && !isPlaceholder(nextAuthUrl), nextAuthUrl || "unset");
line(
  "NEXTAUTH_SECRET",
  Boolean(env.NEXTAUTH_SECRET) && !isPlaceholder(env.NEXTAUTH_SECRET),
  isPlaceholder(env.NEXTAUTH_SECRET) ? "replace placeholder before prod" : "set",
);
line("MONGODB_URI", Boolean(env.MONGODB_URI), env.MONGODB_URI ? "set" : "unset");

const googleReady = Boolean(googleId && googleSecret);
line("Google OAuth", googleReady, googleReady ? "ready" : "fill GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET");
if (nextAuthUrl && googleReady) {
  console.log(`    Redirect URI: ${nextAuthUrl.replace(/\/$/, "")}/api/auth/callback/google`);
}

const telegramEnvReady = Boolean(botToken && botUsername);
line(
  "Telegram env",
  telegramEnvReady,
  telegramEnvReady
    ? `@${botUsername}`
    : "fill TELEGRAM_BOT_TOKEN + NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (no @)",
);

if (env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim().startsWith("@")) {
  line("Telegram username format", false, "remove leading @ from NEXT_PUBLIC_TELEGRAM_BOT_USERNAME");
}

if (botToken && telegramEnvReady) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    if (data.ok) {
      line("Telegram bot token", true, `@${data.result.username}`);
      if (data.result.username !== botUsername) {
        line(
          "Telegram username match",
          false,
          `env has ${botUsername}, BotFather reports ${data.result.username}`,
        );
      }
    } else {
      line("Telegram bot token", false, data.description ?? "getMe failed");
    }
  } catch (err) {
    line("Telegram bot token", false, err instanceof Error ? err.message : "network error");
  }
}

console.log("\nTelegram Login Widget: in @BotFather run /setdomain with the ngrok hostname (no https/port).");
console.log("Google OAuth rejects LAN IPs — use npm run dev:tunnel. Docs: .ai/docs/features/local_oauth_setup.md");

try {
  const host = new URL(nextAuthUrl).hostname;
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (isLanIp) {
    line("OAuth on LAN IP", false, "Google/Telegram need ngrok — run npm run dev:tunnel");
  }
  if (nextAuthUrl.startsWith("http://") && !["localhost", "127.0.0.1"].includes(host)) {
    line("HTTPS for OAuth", false, "Telegram widget needs HTTPS — use ngrok URL");
  }
} catch {
  // invalid NEXTAUTH_URL handled above
}

const blocking = [
  !nextAuthUrl,
  env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim().startsWith("@"),
].some(Boolean);

process.exit(blocking ? 1 : 0);
