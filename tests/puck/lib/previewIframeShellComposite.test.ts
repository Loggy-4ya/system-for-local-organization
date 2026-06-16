/**
 * Run: npm run test:preview-iframe-composite
 * Registry: .ai/docs/testing.md — preview iframe compositing probe
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWebKitEngine } from "../../../src/components/background/infiniteGridIconLoader";

describe("isWebKitEngine", () => {
  it("detects Safari desktop and iOS WebKit user agents", () => {
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
      true,
    );
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
      true,
    );
  });

  it("does not treat Chromium desktop as WebKit", () => {
    assert.equal(
      isWebKitEngine(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
      false,
    );
  });
});
