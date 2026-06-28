#!/usr/bin/env node
/**
 * @fileoverview Copy `.env.example` to `.env.local` for first-time local setup.
 *
 * Usage: npm run env:init
 *
 * Registry: `.ai/docs/env_and_secrets.md`
 *
 * @module scripts/env/envInit
 */

import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { findRepoRoot } from "../lib/repoRoot.mjs";

const root = findRepoRoot(import.meta.url);
const envExample = resolve(root, ".env.example");
const envLocal = resolve(root, ".env.local");

if (!existsSync(envExample)) {
  console.error(`Missing ${envExample}`);
  process.exit(1);
}

if (existsSync(envLocal)) {
  console.warn(`Warning: ${envLocal} already exists — not overwritten.`);
  console.warn("Delete it first or use: npm run env:pull-team (team secrets via dotenvx).");
  process.exit(0);
}

copyFileSync(envExample, envLocal);

console.log(`Created ${envLocal} from .env.example`);
console.log("Next:");
console.log("  1. Set NEXTAUTH_SECRET, ADMIN_SEED_PASSWORD (and MONGODB_URI if using Atlas).");
console.log("  2. npm run auth:check-env");
console.log("  3. npm run docker:up   (or npm run dev)");
