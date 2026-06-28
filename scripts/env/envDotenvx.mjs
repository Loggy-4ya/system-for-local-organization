#!/usr/bin/env node
/**
 * @fileoverview dotenvx helpers for team-shared encrypted env (`.env.staging`).
 *
 * Usage:
 *   npm run env:encrypt-team
 *   npm run env:encrypt-local     # .env.local → .env.staging → encrypt
 *   npm run env:pull-team
 *   npm run env:run -- npm run dev
 *
 * Requires `.env.keys` locally (share via password manager — never commit).
 *
 * Registry: `.ai/docs/env_and_secrets.md`
 */

import { existsSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { findRepoRoot } from "../lib/repoRoot.mjs";

const root = findRepoRoot(import.meta.url);
const stagingFile = resolve(root, ".env.staging");
const stagingPlainExample = resolve(root, ".env.staging.plain.example");
const envLocal = resolve(root, ".env.local");
const envKeys = resolve(root, ".env.keys");

/**
 * Run dotenvx CLI with forwarded args.
 *
 * @param {string[]} args - dotenvx arguments.
 * @param {import("node:child_process").SpawnSyncOptionsWithStringEncoding} [options]
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
function runDotenvx(args, options = {}) {
  return spawnSync("npx", ["@dotenvx/dotenvx", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...options,
  });
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "encrypt-local": {
    if (!existsSync(envLocal)) {
      console.error(`Missing ${envLocal} — run npm run env:init and fill secrets first.`);
      process.exit(1);
    }
    copyFileSync(envLocal, stagingFile);
    console.log(`Copied ${envLocal} → ${stagingFile}`);
    const result = runDotenvx(["encrypt", "-f", stagingFile], { stdio: "inherit", encoding: "buffer" });
    if (result.status === 0) {
      console.log("\nEncrypted .env.staging — safe to commit.");
      console.log("Keep .env.keys in your team vault (never commit).");
      console.log("Teammates: npm run env:pull-team");
    }
    process.exit(result.status ?? 1);
  }

  case "encrypt": {
    if (!existsSync(stagingFile)) {
      console.error(`Missing ${stagingFile}.`);
      console.error(`Copy ${stagingPlainExample} → .env.staging, fill secrets, then encrypt.`);
      process.exit(1);
    }
    const result = runDotenvx(["encrypt", "-f", stagingFile], { stdio: "inherit", encoding: "buffer" });
    process.exit(result.status ?? 1);
  }

  case "pull": {
    if (!existsSync(stagingFile)) {
      console.error(`Missing team file ${stagingFile}. Clone repo or ask a maintainer.`);
      process.exit(1);
    }
    if (!existsSync(envKeys) && !process.env.DOTENV_PRIVATE_KEY) {
      console.error("Missing .env.keys (or DOTENV_PRIVATE_KEY). Get the key from your team vault.");
      process.exit(1);
    }
    const decrypt = runDotenvx(["decrypt", "-f", stagingFile, "--stdout"]);
    if (decrypt.status !== 0) {
      if (decrypt.stderr) process.stderr.write(decrypt.stderr);
      process.exit(decrypt.status ?? 1);
    }
    writeFileSync(envLocal, decrypt.stdout, "utf8");
    console.log(`Wrote decrypted team env to ${envLocal}`);
    console.log("Restart Docker/web after changing env: docker compose up -d --force-recreate web");
    process.exit(0);
  }

  case "run": {
    if (rest.length === 0) {
      console.error("Usage: npm run env:run -- <command...>");
      process.exit(1);
    }
    if (!existsSync(stagingFile)) {
      console.error(`Missing ${stagingFile}.`);
      process.exit(1);
    }
    const result = runDotenvx(["run", "-f", stagingFile, "--", ...rest], { stdio: "inherit", encoding: "buffer" });
    process.exit(result.status ?? 1);
  }

  default:
    console.log(`Usage:
  npm run env:encrypt-local   # copy .env.local → .env.staging, then encrypt
  npm run env:encrypt-team    # encrypt existing .env.staging
  npm run env:pull-team
  npm run env:run -- npm run dev`);
    process.exit(command ? 1 : 0);
}
