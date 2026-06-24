/**
 * @fileoverview Safe remote image download for server-side import into local storage.
 *
 * Validates URLs against SSRF (HTTPS-only, blocked hosts/IPs, DNS re-check on
 * redirects), fetches with size/time limits, and sniffs raster image magic bytes.
 * SVG and markup responses are rejected.
 *
 * @module shared/lib/mediaStorage/remoteImageImport
 *
 * Tests: `npm run test:remote-image-import`
 * Registry: `.ai/docs/testing.md`
 */

import dns from "node:dns/promises";
import { isIP } from "node:net";

/** Default fetch timeout for remote image downloads. */
export const REMOTE_IMAGE_FETCH_TIMEOUT_MS = 30_000;

/** Maximum redirect hops when following a remote image URL. */
export const REMOTE_IMAGE_MAX_REDIRECTS = 5;

/** MIME types allowed when importing images from a remote URL (no SVG). */
export const REMOTE_IMPORT_ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** Result of a successful guarded remote fetch. */
export interface RemoteImageFetchResult {
  /** Downloaded bytes (already size-validated). */
  buffer: Buffer;
  /** Final URL after redirects (used for filename hints). */
  finalUrl: URL;
}

/** Thrown when a remote URL or download fails validation or fetch rules. */
export class MediaRemoteImportError extends Error {
  /**
   * @param message - User-facing error message.
   */
  constructor(message: string) {
    super(message);
    this.name = "MediaRemoteImportError";
  }
}

/** Hostnames always blocked for remote import (case-insensitive). */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

/**
 * Determine whether a hostname string refers to a blocked literal IP address.
 *
 * @param hostname - Host from a parsed URL (may be IPv4/IPv6 literal).
 * @returns True when the address is loopback, link-local, private, or metadata.
 */
export function isBlockedLiteralIp(hostname: string): boolean {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  const version = isIP(normalized);
  if (version === 4) {
    return isBlockedIpv4(normalized);
  }
  if (version === 6) {
    return isBlockedIpv6(normalized);
  }
  return false;
}

/**
 * Determine whether a hostname label is on the static blocklist.
 *
 * @param hostname - Parsed URL hostname.
 * @returns True when the host must not be fetched.
 */
export function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith(".localhost")) return true;
  if (lower.endsWith(".internal")) return true;
  return isBlockedLiteralIp(hostname);
}

/**
 * Parse and validate a remote image URL before any network I/O.
 *
 * Requires HTTPS, rejects credentials in URL, and blocks private/metadata hosts.
 *
 * @param rawUrl - User-supplied image URL.
 * @returns Normalised URL instance.
 * @throws {@link MediaRemoteImportError} When the URL is not allowed.
 */
export function parseAllowedRemoteImageUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new MediaRemoteImportError("Image URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MediaRemoteImportError("Invalid image URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new MediaRemoteImportError("Only HTTPS image URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new MediaRemoteImportError("Image URLs with credentials are not allowed.");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new MediaRemoteImportError("That image host is not allowed.");
  }

  return parsed;
}

/**
 * Resolve a hostname and ensure every address is public (SSRF guard).
 *
 * @param hostname - DNS hostname from a validated URL.
 * @throws {@link MediaRemoteImportError} When lookup fails or resolves to blocked IPs.
 */
export async function assertHostnameResolvesToPublicIps(hostname: string): Promise<void> {
  if (isBlockedLiteralIp(hostname)) {
    throw new MediaRemoteImportError("That image host is not allowed.");
  }

  if (isIP(hostname)) {
    return;
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new MediaRemoteImportError("Could not resolve image host.");
  }

  if (records.length === 0) {
    throw new MediaRemoteImportError("Could not resolve image host.");
  }

  for (const record of records) {
    if (isBlockedLiteralIp(record.address)) {
      throw new MediaRemoteImportError("That image host is not allowed.");
    }
  }
}

/**
 * Fully validate a remote image URL (parse + DNS) before fetch.
 *
 * @param rawUrl - User-supplied image URL.
 * @returns Normalised URL instance.
 */
export async function assertRemoteImageUrlAllowed(rawUrl: string): Promise<URL> {
  const parsed = parseAllowedRemoteImageUrl(rawUrl);
  await assertHostnameResolvesToPublicIps(parsed.hostname);
  return parsed;
}

/**
 * Sniff a supported raster image MIME type from file magic bytes.
 *
 * SVG/XML/HTML responses are rejected even if Content-Type claims image/*.
 *
 * @param buffer - Downloaded payload.
 * @returns MIME type or null when unsupported or suspicious.
 */
export function sniffRemoteImageMime(buffer: Buffer): (typeof REMOTE_IMPORT_ALLOWED_IMAGE_MIMES)[number] | null {
  if (buffer.length < 8) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  const head = buffer.subarray(0, Math.min(512, buffer.length)).toString("utf8").trimStart();
  if (head.startsWith("<") || head.startsWith("%3C")) {
    return null;
  }

  return null;
}

/**
 * Derive a storage filename stem from the final download URL and sniffed MIME.
 *
 * @param finalUrl - URL after redirects.
 * @param mimeType - Sniffed MIME type.
 * @returns Filename suitable for {@link buildStoredFilename} input.
 */
export function deriveRemoteImageOriginalName(finalUrl: URL, mimeType: string): string {
  const segment = finalUrl.pathname.split("/").pop() ?? "";
  const decoded = decodeURIComponent(segment).trim();
  const extFromMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  const fallbackExt = extFromMime[mimeType] ?? ".png";

  if (!decoded || decoded === "/") {
    return `remote-image${fallbackExt}`;
  }

  const hasImageExt = /\.(jpe?g|png|gif|webp)$/i.test(decoded);
  if (hasImageExt) {
    return decoded.slice(0, 120);
  }

  return `${decoded.replace(/\.[^.]+$/, "").slice(0, 100) || "remote-image"}${fallbackExt}`;
}

/**
 * Download a remote image with SSRF checks, redirect validation, and size cap.
 *
 * @param rawUrl - User-supplied HTTPS image URL.
 * @param maxBytes - Maximum allowed payload size for the upload purpose.
 * @returns Buffer and final URL metadata.
 * @throws {@link MediaRemoteImportError} On validation, network, or size failures.
 */
export async function fetchRemoteImage(
  rawUrl: string,
  maxBytes: number,
): Promise<RemoteImageFetchResult> {
  let currentUrl = await assertRemoteImageUrlAllowed(rawUrl);

  for (let redirectCount = 0; redirectCount <= REMOTE_IMAGE_MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_IMAGE_FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "NexusMediaImporter/1.0",
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MediaRemoteImportError("Image download timed out.");
      }
      throw new MediaRemoteImportError("Could not download image.");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new MediaRemoteImportError("Image download redirect was invalid.");
      }
      currentUrl = await assertRemoteImageUrlAllowed(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new MediaRemoteImportError(`Image download failed (${response.status}).`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const declared = Number.parseInt(contentLength, 10);
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new MediaRemoteImportError("Image exceeds the size limit for this upload type.");
      }
    }

    const buffer = await readResponseBodyWithLimit(response, maxBytes);
    return { buffer, finalUrl: currentUrl };
  }

  throw new MediaRemoteImportError("Too many redirects while downloading image.");
}

/**
 * Read a fetch response body without exceeding maxBytes.
 *
 * @param response - Fetch response with OK status.
 * @param maxBytes - Hard size cap.
 * @returns Aggregated buffer.
 */
async function readResponseBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    throw new MediaRemoteImportError("Image download returned an empty body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new MediaRemoteImportError("Image exceeds the size limit for this upload type.");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

/**
 * Test whether an IPv4 address is private, loopback, link-local, or reserved.
 *
 * @param ip - IPv4 string.
 */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

/**
 * Test whether an IPv6 address is loopback, link-local, unique-local, or unspecified.
 *
 * @param ip - IPv6 string (without brackets).
 */
function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (isIP(mapped) === 4) {
      return isBlockedIpv4(mapped);
    }
  }

  return false;
}
