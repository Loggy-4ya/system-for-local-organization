/**
 * @fileoverview Unit tests for stuck-loader auto-reload guards.
 *
 * Run: `npm run test:loader-auto-retry`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOADER_AUTO_RETRY_MAX,
  canLoaderAutoRetry,
  clearLoaderAutoRetry,
  loaderAutoRetryStorageKey,
  readLoaderAutoRetryCount,
  recordLoaderAutoRetry,
  resolveLoaderAutoRetryDelayMs,
} from "@/lib/loaderAutoRetryLogic";

describe("loaderAutoRetryLogic", () => {
  it("builds stable storage keys per pathname", () => {
    assert.equal(loaderAutoRetryStorageKey("/news"), "nexus-loader-retry:/news");
    assert.equal(loaderAutoRetryStorageKey(""), "nexus-loader-retry:/");
  });

  it("tracks retry counts in memory storage", () => {
    const store = new Map<string, string>();
    const read = (key: string) => store.get(key) ?? null;
    const write = (key: string, value: string) => {
      store.set(key, value);
    };
    const remove = (key: string) => {
      store.delete(key);
    };

    assert.equal(readLoaderAutoRetryCount("/news", read), 0);
    assert.equal(canLoaderAutoRetry("/news", read), true);

    recordLoaderAutoRetry("/news", write, read);
    assert.equal(readLoaderAutoRetryCount("/news", read), 1);
    assert.equal(canLoaderAutoRetry("/news", read), true);

    recordLoaderAutoRetry("/news", write, read);
    assert.equal(readLoaderAutoRetryCount("/news", read), 2);
    assert.equal(canLoaderAutoRetry("/news", read), false);

    clearLoaderAutoRetry("/news", remove);
    assert.equal(readLoaderAutoRetryCount("/news", read), 0);
    assert.equal(canLoaderAutoRetry("/news", read), true);
  });

  it("caps retries at LOADER_AUTO_RETRY_MAX", () => {
    assert.equal(LOADER_AUTO_RETRY_MAX, 2);
  });

  it("falls back to default delay for invalid values", () => {
    assert.equal(resolveLoaderAutoRetryDelayMs(12_000), 12_000);
    assert.equal(resolveLoaderAutoRetryDelayMs(0), 7_000);
    assert.equal(resolveLoaderAutoRetryDelayMs(Number.NaN), 7_000);
  });
});
