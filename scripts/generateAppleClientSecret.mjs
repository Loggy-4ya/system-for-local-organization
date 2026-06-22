#!/usr/bin/env node
/**
 * @fileoverview Generate an Apple Sign In client secret JWT for Auth.js.
 *
 * Apple requires a signed ES256 JWT (max 6 months). Paste the output into
 * AUTH_APPLE_SECRET in `.env.local`, then restart the web container.
 *
 * Run:
 *   npm run auth:apple-secret -- \
 *     --team-id YOUR_TEAM_ID \
 *     --client-id com.example.nexus.service \
 *     --key-id YOUR_KEY_ID \
 *     --key-file ./AuthKey_XXXXX.p8
 */

import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";

/** @param {string} name */
function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(`Missing ${name}`);
    printUsage();
    process.exit(1);
  }
  return process.argv[idx + 1];
}

function printUsage() {
  console.error(`
Usage:
  npm run auth:apple-secret -- \\
    --team-id TEAM_ID \\
    --client-id SERVICES_ID \\
    --key-id KEY_ID \\
    --key-file path/to/AuthKey_KEYID.p8

Optional:
  --expires-days 180   (default 180, Apple max ~180)
`);
}

/** @param {Record<string, unknown>} payload */
function base64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

const teamId = arg("--team-id");
const clientId = arg("--client-id");
const keyId = arg("--key-id");
const keyFile = arg("--key-file");

const expiresDaysArg = process.argv.indexOf("--expires-days");
const expiresDays =
  expiresDaysArg !== -1 && process.argv[expiresDaysArg + 1]
    ? Number(process.argv[expiresDaysArg + 1])
    : 180;

if (!Number.isFinite(expiresDays) || expiresDays < 1 || expiresDays > 180) {
  console.error("--expires-days must be between 1 and 180");
  process.exit(1);
}

const privateKey = readFileSync(keyFile, "utf8");
const now = Math.floor(Date.now() / 1000);

const header = { alg: "ES256", kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + expiresDays * 24 * 60 * 60,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
const keyObject = createPrivateKey(privateKey);
const rawSignature = sign("sha256", Buffer.from(signingInput), {
  key: keyObject,
  dsaEncoding: "ieee-p1363",
});
const jwt = `${signingInput}.${rawSignature.toString("base64url")}`;

console.log(jwt);
console.error(`\nValid for ~${expiresDays} days. Set AUTH_APPLE_ID=${clientId} and paste JWT into AUTH_APPLE_SECRET.`);
