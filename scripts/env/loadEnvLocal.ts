/**
 * @fileoverview Load `.env.local` into `process.env` for one-off Node jobs.
 *
 * Jobs use the same MongoDB target as local dev — typically a remote Atlas URI in
 * `.env.local`, not the bundled Docker `mongodb://db:27017/nexus` profile.
 *
 * @module scripts/env/loadEnvLocal
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findRepoRoot } from "../lib/repoRoot";

const root = findRepoRoot(import.meta.url);
const envPath = resolve(root, ".env.local");

/**
 * Parse key/value pairs from a dotenv-style file.
 *
 * @param path - Absolute path to the env file.
 * @returns Parsed environment map.
 */
function parseEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(path)) {
    return env;
  }

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  return env;
}

/**
 * Merge `.env.local` into `process.env` when keys are not already set.
 *
 * @returns True when `.env.local` was found and parsed.
 */
export function loadEnvLocal(): boolean {
  if (!existsSync(envPath)) {
    return false;
  }

  const parsed = parseEnvFile(envPath);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

export { envPath };
