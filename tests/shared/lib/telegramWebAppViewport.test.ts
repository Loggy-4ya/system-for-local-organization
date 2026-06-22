/**
 * @fileoverview Unit tests for Telegram Mini App viewport helpers.
 *
 * Module under test: shared/lib/telegramWebAppViewport.ts
 *
 * Run: `npm run test:telegram-webapp-viewport`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTelegramWebAppViewportStyleVars,
  normalizeTelegramWebAppChromeColor,
  resolveTelegramWebAppLayoutHeightPx,
  resolveTelegramWebAppLayoutWidthPx,
} from "@shared/lib/telegramWebAppViewport";

describe("resolveTelegramWebAppLayoutHeightPx", () => {
  it("prefers viewportStableHeight when set", () => {
    assert.equal(
      resolveTelegramWebAppLayoutHeightPx({
        viewportHeight: 640,
        viewportStableHeight: 720,
      }),
      720,
    );
  });

  it("falls back to viewportHeight when stable height is missing", () => {
    assert.equal(
      resolveTelegramWebAppLayoutHeightPx({ viewportHeight: 812 }),
      812,
    );
  });

  it("never returns zero", () => {
    assert.equal(
      resolveTelegramWebAppLayoutHeightPx({ viewportHeight: 0, viewportStableHeight: 0 }),
      1,
    );
  });

  it("uses the larger of Telegram metrics and window.innerHeight", () => {
    assert.equal(
      resolveTelegramWebAppLayoutHeightPx(
        { viewportHeight: 640, viewportStableHeight: 680 },
        { innerHeight: 920 },
      ),
      920,
    );
  });
});

describe("resolveTelegramWebAppLayoutWidthPx", () => {
  it("mirrors window.innerWidth", () => {
    assert.equal(resolveTelegramWebAppLayoutWidthPx({ innerWidth: 1180 }), 1180);
  });
});

describe("buildTelegramWebAppViewportStyleVars", () => {
  it("writes stable and live viewport CSS variables", () => {
    const vars = buildTelegramWebAppViewportStyleVars({
      viewportHeight: 900,
      viewportStableHeight: 880,
    });
    assert.equal(vars["--tg-viewport-stable-height"], "880px");
    assert.equal(vars["--tg-viewport-height"], "900px");
  });

  it("includes width and window height when metrics are provided", () => {
    const vars = buildTelegramWebAppViewportStyleVars(
      { viewportHeight: 700, viewportStableHeight: 680 },
      { innerWidth: 1024, innerHeight: 860 },
    );
    assert.equal(vars["--tg-viewport-stable-height"], "860px");
    assert.equal(vars["--tg-viewport-width"], "1024px");
    assert.equal(vars["--tg-viewport-window-height"], "860px");
  });
});

describe("normalizeTelegramWebAppChromeColor", () => {
  it("trims whitespace from computed tokens", () => {
    assert.equal(normalizeTelegramWebAppChromeColor("  #0f1729  "), "#0f1729");
  });

  it("uses fallback for empty values", () => {
    assert.equal(normalizeTelegramWebAppChromeColor("   "), "#0f1729");
  });
});
