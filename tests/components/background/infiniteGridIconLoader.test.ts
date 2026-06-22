/**
 * @fileoverview Unit tests for InfiniteGrid icon URL resolution.
 *
 * Module under test: src/components/background/infiniteGridIconLoader.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:infinite-grid-icon-loader`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWebKitEngine,
  resolveGridIconUrl,
} from "../../../src/components/background/infiniteGridIconLoader";

describe("infiniteGridIconLoader", () => {
  it("resolveGridIconUrl absolutizes root-relative brand paths", () => {
    assert.equal(
      resolveGridIconUrl("/brand/logo-grid.svg", "http://localhost:3000"),
      "http://localhost:3000/brand/logo-grid.svg",
    );
  });

  it("resolveGridIconUrl preserves absolute http(s) URLs", () => {
    assert.equal(
      resolveGridIconUrl("https://cdn.example/logo.svg", "http://localhost:3000"),
      "https://cdn.example/logo.svg",
    );
  });

  it("resolveGridIconUrl normalizes scheme-relative URLs", () => {
    assert.equal(
      resolveGridIconUrl("//cdn.example/logo.svg", "http://localhost:3000"),
      "https://cdn.example/logo.svg",
    );
  });

  it("isWebKitEngine detects iOS and desktop Safari", () => {
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
      true,
    );
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
      ),
      true,
    );
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
      false,
    );
  });
});
