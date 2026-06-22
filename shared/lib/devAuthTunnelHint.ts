/**
 * @fileoverview Detect when OAuth/Telegram widgets need an HTTPS tunnel in dev.
 *
 * Google OAuth rejects LAN IPs. Telegram Login Widget requires HTTPS + /setdomain.
 *
 * @module shared/lib/devAuthTunnelHint
 */

/** Hostnames that may use plain HTTP for local auth testing. */
const PLAIN_HTTP_AUTH_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Whether the current browser location needs ngrok (or similar) for OAuth/Telegram widgets.
 *
 * @param protocol - `window.location.protocol` (e.g. `http:`).
 * @param hostname - `window.location.hostname`.
 * @returns True when widgets are unlikely to work without HTTPS + public domain.
 */
export function devAuthNeedsHttpsTunnel(protocol: string, hostname: string): boolean {
  if (protocol === "https:") {
    return false;
  }
  return !PLAIN_HTTP_AUTH_HOSTS.has(hostname.toLowerCase());
}

/** Copy shown on login/signup when LAN HTTP blocks OAuth providers. */
export const DEV_AUTH_TUNNEL_HINT =
  "Google and Telegram sign-in require HTTPS and a public domain. Run npm run dev:tunnel, register the ngrok URL in Google Console and @BotFather /setdomain, then open the tunnel URL — not a LAN IP.";
