/**
 * @fileoverview Resolve a client-reachable origin for redirects in Docker dev.
 *
 * Next.js dev with `--hostname 0.0.0.0` may yield `0.0.0.0` or `localhost` in
 * request origins. Phones cannot reach those hosts — and `localhost` on a phone
 * is the phone itself, not your dev machine. Prefer `NEXTAUTH_URL` set to the
 * same LAN URL you open in the mobile browser.
 *
 * @module src/lib/publicOrigin
 */

import type { NextRequest } from "next/server";

/** Hostnames that must never be sent to mobile browsers. */
const UNREACHABLE_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"]);

/**
 * Build the public site origin for redirects (scheme + host + port).
 *
 * Priority: `NEXTAUTH_URL` / `AUTH_URL` env → request `Host` header → fallback.
 *
 * @param req - Optional incoming request for host header fallback.
 * @returns Origin string, e.g. `http://192.168.50.10:8080`.
 */
export function resolvePublicOrigin(req?: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      /* fall through */
    }
  }

  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto =
      req.headers.get("x-forwarded-proto") ??
      req.nextUrl.protocol.replace(":", "") ??
      "http";

    if (host) {
      const hostname = host.split(":")[0]?.toLowerCase() ?? "";
      if (!UNREACHABLE_HOSTS.has(hostname)) {
        return `${proto}://${host}`;
      }
    }

    const originHost = req.nextUrl.hostname.toLowerCase();
    if (!UNREACHABLE_HOSTS.has(originHost)) {
      return req.nextUrl.origin;
    }
  }

  return "http://localhost:8080";
}

/**
 * Build an absolute URL on the public origin.
 *
 * @param path - Path starting with `/`.
 * @param req - Optional incoming request.
 * @returns Absolute URL clients can open.
 */
export function publicUrl(path: string, req?: NextRequest): URL {
  return new URL(path, resolvePublicOrigin(req));
}
