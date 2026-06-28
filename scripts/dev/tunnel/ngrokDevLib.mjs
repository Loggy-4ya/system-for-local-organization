#!/usr/bin/env node
/**
 * @fileoverview Shared helpers for host ngrok dev tunnel scripts.
 *
 * @module scripts/ngrokDevLib.mjs
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { findRepoRoot } from "../../lib/repoRoot.mjs";

export const root = findRepoRoot(import.meta.url);
export const envPath = resolve(root, ".env.local");
export const pidPath = resolve(root, ".ngrok.pid");
export const inspectorUrl = process.env.NGROK_INSPECTOR_URL ?? "http://127.0.0.1:4040/api/tunnels";
export const defaultLocalPort = process.env.NGROK_LOCAL_PORT ?? "8080";

/** @param {string} path */
export function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  /** @type {Record<string, string>} */
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash !== -1) value = value.slice(0, hash).trim();
    env[key] = value;
  }
  return env;
}

/**
 * Strip scheme/trailing slash from ngrok static domain env value.
 *
 * @param {string | undefined} raw
 * @returns {string | null}
 */
export function normalizeNgrokStaticDomain(raw) {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Normalize a public HTTPS base URL (fixes common `https:/host` typos).
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizePublicBaseUrl(raw) {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (/^https:\/[^/]/i.test(trimmed)) {
    return trimmed.replace(/^https:\//i, "https://");
  }
  return trimmed;
}

/**
 * Build canonical HTTPS URL from a static ngrok domain.
 *
 * @param {string} staticDomain
 * @returns {string}
 */
export function staticDomainToPublicUrl(staticDomain) {
  return normalizePublicBaseUrl(`https://${normalizeNgrokStaticDomain(staticDomain) ?? staticDomain}`);
}

/** @returns {string} */
export function resolveNgrokBinary() {
  const fromPath = spawnSync("which", ["ngrok"], { encoding: "utf8" });
  if (fromPath.status === 0 && fromPath.stdout.trim()) {
    return fromPath.stdout.trim();
  }
  if (existsSync("/snap/bin/ngrok")) {
    return "/snap/bin/ngrok";
  }
  throw new Error(
    "ngrok not found. Install: sudo snap install ngrok — then open a new terminal or use /snap/bin/ngrok",
  );
}

/** @param {number} ms */
export function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** @returns {Promise<string | null>} */
export async function fetchPublicHttpsUrl() {
  try {
    const res = await fetch(inspectorUrl);
    if (!res.ok) return null;
    /** @type {{ tunnels?: Array<{ public_url?: string }> }} */
    const data = await res.json();
    const https = (data.tunnels ?? []).find((t) => t.public_url?.startsWith("https://"));
    return https?.public_url?.replace(/\/$/, "") ?? null;
  } catch {
    return null;
  }
}

/**
 * Probe whether an HTTPS origin already forwards to Nexus.
 *
 * @param {string} publicUrl
 * @returns {Promise<boolean>}
 */
export async function probeNexusPublicUrl(publicUrl) {
  try {
    const res = await fetch(`${publicUrl.replace(/\/$/, "")}/login`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const html = await res.text();
    if (/Your new ngrok Cloud Endpoint!/i.test(html)) {
      return false;
    }
    return /Sign in|Create account|nexus/i.test(html);
  } catch {
    return false;
  }
}

/**
 * Resolve the active public HTTPS URL: local inspector, static domain probe, or null.
 *
 * @param {string | null} staticDomain
 * @returns {Promise<string | null>}
 */
export async function resolveActivePublicUrl(staticDomain) {
  const fromInspector = await fetchPublicHttpsUrl();
  if (fromInspector) return normalizePublicBaseUrl(fromInspector);

  if (staticDomain) {
    const candidate = staticDomainToPublicUrl(staticDomain);
    if (await probeNexusPublicUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

/** @param {number} pid */
export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Stop host ngrok started by {@link startDevTunnel}. */
export function stopHostNgrok() {
  if (!existsSync(pidPath)) return false;
  const pid = Number(readFileSync(pidPath, "utf8").trim());
  if (!Number.isFinite(pid) || !isProcessAlive(pid)) {
    unlinkSync(pidPath);
    return false;
  }
  process.kill(pid, "SIGTERM");
  unlinkSync(pidPath);
  return true;
}

/** @param {string} content @param {string} key @param {string} value */
export function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

/** @param {string} cmd @param {string[]} args */
export function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Write NEXTAUTH_URL to `.env.local`.
 *
 * @param {string} publicUrl
 */
export function syncNextAuthUrl(publicUrl) {
  const normalized = normalizePublicBaseUrl(publicUrl);
  let envContent = readFileSync(envPath, "utf8");
  envContent = upsertEnvVar(envContent, "NEXTAUTH_URL", normalized);
  writeFileSync(envPath, envContent, "utf8");
  return normalized;
}

/**
 * Build ngrok v3 CLI args for `ngrok http`.
 *
 * @param {{ staticDomain: string | null; localPort: string }} opts
 * @returns {string[]}
 */
export function buildNgrokHttpArgs({ staticDomain, localPort }) {
  /** @type {string[]} */
  const args = ["http", localPort];
  if (staticDomain) {
    args.push("--url", `https://${staticDomain}`);
  }
  return args;
}

/**
 * Start host ngrok pointing at the local Nexus port.
 *
 * @param {{ authtoken: string; staticDomain: string | null; localPort: string }} opts
 * @returns {number} ngrok process pid
 */
export function startHostNgrok({ authtoken, staticDomain, localPort }) {
  stopHostNgrok();

  const ngrokBin = resolveNgrokBinary();
  const args = buildNgrokHttpArgs({ staticDomain, localPort });

  if (authtoken.startsWith("ep_")) {
    throw new Error(
      "NGROK_AUTHTOKEN looks like an endpoint token (ep_…), not an agent authtoken. " +
        "Copy the Authtoken from https://dashboard.ngrok.com/get-started/your-authtoken",
    );
  }

  const child = spawn(ngrokBin, args, {
    cwd: root,
    env: { ...process.env, NGROK_AUTHTOKEN: authtoken },
    detached: true,
    stdio: "ignore",
  });

  if (!child.pid) {
    throw new Error("Failed to start ngrok — no pid returned");
  }

  child.unref();
  writeFileSync(pidPath, String(child.pid), "utf8");
  return child.pid;
}
