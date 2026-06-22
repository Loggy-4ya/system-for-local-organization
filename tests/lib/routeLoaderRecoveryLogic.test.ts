/**
 * @fileoverview Unit tests for stuck-loader back-navigation recovery logic.
 *
 * Run: `npm run test:route-loader-recovery`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/lib/routeLoaderRecoveryLogic.test
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  LOADER_BACK_REFRESH_DELAY_MS,
  LOADER_BACK_RELOAD_DELAY_MS,
  LOADER_DEFAULT_REFRESH_DELAY_MS,
  LOADER_DEFAULT_RELOAD_DELAY_MS,
  isBackForwardNavigationType,
  markHistoryPopNavigation,
  resetHistoryPopNavigationForTests,
  resolveLoaderRecoveryDelays,
  shouldTreatAsBackNavigation,
  wasRecentHistoryPopNavigation,
} from "@/lib/routeLoaderRecoveryLogic";

afterEach(() => {
  resetHistoryPopNavigationForTests();
});

describe("routeLoaderRecoveryLogic", () => {
  it("detects back_forward navigation types", () => {
    assert.equal(isBackForwardNavigationType("back_forward"), true);
    assert.equal(isBackForwardNavigationType("navigate"), false);
    assert.equal(isBackForwardNavigationType(undefined), false);
  });

  it("tracks recent popstate within the history window", () => {
    const now = 10_000;
    assert.equal(wasRecentHistoryPopNavigation(now), false);

    markHistoryPopNavigation(now - 500);
    assert.equal(wasRecentHistoryPopNavigation(now), true);
    assert.equal(wasRecentHistoryPopNavigation(now + 5_000), false);
  });

  it("uses fast delays for back navigation", () => {
    markHistoryPopNavigation(Date.now());
    assert.equal(shouldTreatAsBackNavigation(), true);

    const delays = resolveLoaderRecoveryDelays(true);
    assert.equal(delays.refreshMs, LOADER_BACK_REFRESH_DELAY_MS);
    assert.equal(delays.reloadMs, LOADER_BACK_RELOAD_DELAY_MS);
  });

  it("uses default delays for forward navigations", () => {
    const delays = resolveLoaderRecoveryDelays(false);
    assert.equal(delays.refreshMs, LOADER_DEFAULT_REFRESH_DELAY_MS);
    assert.equal(delays.reloadMs, LOADER_DEFAULT_RELOAD_DELAY_MS);
  });

  it("honours reload override while keeping refresh timing", () => {
    const delays = resolveLoaderRecoveryDelays(false, 9_000);
    assert.equal(delays.refreshMs, LOADER_DEFAULT_REFRESH_DELAY_MS);
    assert.equal(delays.reloadMs, 9_000);
  });
});
