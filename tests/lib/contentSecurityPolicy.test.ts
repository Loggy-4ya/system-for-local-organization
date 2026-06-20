/**
 * Run: npm run test:content-security-policy
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for Content-Security-Policy header builder.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentSecurityPolicy } from "@/lib/contentSecurityPolicy";

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
});
