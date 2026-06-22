/**
 * Run: npm run test:content-security-policy
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for Content-Security-Policy header builder.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildContentSecurityPolicy,
  generateCspNonce,
  isCspNonceEnabled,
} from "@/lib/contentSecurityPolicy";

describe("buildContentSecurityPolicy", () => {
  it("blocks object-src and restricts base-uri", () => {
    const csp = buildContentSecurityPolicy();
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /frame-src 'self' https:\/\/www\.youtube\.com/);
  });

  it("allows unsafe-eval in development for Next.js HMR", () => {
    const csp = buildContentSecurityPolicy({ isDev: true });
    assert.match(csp, /'unsafe-eval'/);
  });

  it("omits unsafe-eval in production", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });
    assert.doesNotMatch(csp, /unsafe-eval/);
  });

  it("uses nonce and strict-dynamic when nonce is provided", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", isDev: false });
    assert.match(csp, /script-src 'self' 'nonce-abc123' 'strict-dynamic'/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  });

  it("adds unsafe-eval to nonce mode in development", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc123", isDev: true });
    assert.match(csp, /'unsafe-eval'/);
  });
});

describe("generateCspNonce", () => {
  it("returns a non-empty base64 string", () => {
    const nonce = generateCspNonce();
    assert.ok(nonce.length >= 16);
    assert.match(nonce, /^[A-Za-z0-9+/=]+$/);
  });
});

describe("isCspNonceEnabled", () => {
  it("respects CSP_USE_NONCE override", () => {
    const previous = process.env.CSP_USE_NONCE;
    process.env.CSP_USE_NONCE = "true";
    assert.equal(isCspNonceEnabled(), true);
    process.env.CSP_USE_NONCE = "false";
    assert.equal(isCspNonceEnabled(), false);
    if (previous === undefined) {
      delete process.env.CSP_USE_NONCE;
    } else {
      process.env.CSP_USE_NONCE = previous;
    }
  });
});
