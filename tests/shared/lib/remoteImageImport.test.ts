/**
 * @fileoverview Unit tests for remote image import guards and MIME sniffing.
 *
 * Run: npm run test:remote-image-import
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveRemoteImageOriginalName,
  isBlockedHostname,
  isBlockedLiteralIp,
  MediaRemoteImportError,
  parseAllowedRemoteImageUrl,
  sniffRemoteImageMime,
} from "@shared/lib/mediaStorage/remoteImageImport";

describe("parseAllowedRemoteImageUrl", () => {
  it("accepts public HTTPS URLs", () => {
    const url = parseAllowedRemoteImageUrl("https://cdn.example.com/assets/photo.png");
    assert.equal(url.hostname, "cdn.example.com");
    assert.equal(url.pathname, "/assets/photo.png");
  });

  it("rejects HTTP URLs", () => {
    assert.throws(
      () => parseAllowedRemoteImageUrl("http://example.com/a.png"),
      (err: unknown) =>
        err instanceof MediaRemoteImportError && err.message.includes("HTTPS"),
    );
  });

  it("rejects localhost and credentials", () => {
    assert.throws(() => parseAllowedRemoteImageUrl("https://localhost/x.png"));
    assert.throws(() => parseAllowedRemoteImageUrl("https://user:pass@example.com/x.png"));
  });
});

describe("isBlockedLiteralIp", () => {
  it("blocks loopback and private IPv4 ranges", () => {
    assert.equal(isBlockedLiteralIp("127.0.0.1"), true);
    assert.equal(isBlockedLiteralIp("10.0.0.5"), true);
    assert.equal(isBlockedLiteralIp("192.168.1.1"), true);
    assert.equal(isBlockedLiteralIp("169.254.169.254"), true);
    assert.equal(isBlockedLiteralIp("8.8.8.8"), false);
  });

  it("blocks IPv6 loopback and link-local", () => {
    assert.equal(isBlockedLiteralIp("::1"), true);
    assert.equal(isBlockedLiteralIp("fe80::1"), true);
  });
});

describe("isBlockedHostname", () => {
  it("blocks metadata and internal host suffixes", () => {
    assert.equal(isBlockedHostname("metadata.google.internal"), true);
    assert.equal(isBlockedHostname("app.internal"), true);
    assert.equal(isBlockedHostname("cdn.example.com"), false);
  });
});

describe("sniffRemoteImageMime", () => {
  it("detects PNG, JPEG, GIF, and WebP magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(sniffRemoteImageMime(png), "image/png");

    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00, 0x00]);
    assert.equal(sniffRemoteImageMime(jpeg), "image/jpeg");

    const gif = Buffer.from("GIF89a\x00\x00", "ascii");
    assert.equal(sniffRemoteImageMime(gif), "image/gif");

    const webp = Buffer.alloc(12);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    assert.equal(sniffRemoteImageMime(webp), "image/webp");
  });

  it("rejects SVG and HTML markup", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
    assert.equal(sniffRemoteImageMime(svg), null);

    const html = Buffer.from("<html><body>x</body></html>", "utf8");
    assert.equal(sniffRemoteImageMime(html), null);
  });
});

describe("deriveRemoteImageOriginalName", () => {
  it("preserves image extensions from the URL path", () => {
    const url = new URL("https://cdn.example.com/path/my-photo.jpeg");
    assert.equal(deriveRemoteImageOriginalName(url, "image/jpeg"), "my-photo.jpeg");
  });

  it("adds extension when the URL path has none", () => {
    const url = new URL("https://cdn.example.com/download/12345");
    assert.equal(deriveRemoteImageOriginalName(url, "image/png"), "12345.png");
  });
});
