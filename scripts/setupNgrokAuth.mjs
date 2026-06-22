#!/usr/bin/env node
/**
 * @fileoverview One-time ngrok authtoken setup from `.env.local`.
 *
 * Run: npm run dev:tunnel:setup
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  envPath,
  loadEnvFile,
  resolveNgrokBinary,
} from "./ngrokDevLib.mjs";

if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const authtoken = loadEnvFile(envPath).NGROK_AUTHTOKEN?.trim();
if (!authtoken) {
  console.error("Add NGROK_AUTHTOKEN to .env.local first.");
  process.exit(1);
}

if (authtoken.startsWith("ep_")) {
  console.error(`
NGROK_AUTHTOKEN looks like an endpoint token (starts with ep_), not an agent authtoken.

Copy the **Authtoken** from:
  https://dashboard.ngrok.com/get-started/your-authtoken

It usually starts with something like "2" and is much longer.
`);
  process.exit(1);
}

const ngrokBin = resolveNgrokBinary();
const result = spawnSync(ngrokBin, ["config", "add-authtoken", authtoken], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
