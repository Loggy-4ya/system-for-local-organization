/**
 * @fileoverview Unit tests for orphan upload cleanup planning logic.
 *
 * Run: npm run test:orphan-upload-cleanup
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findOrphanStorageKeys,
  readOrphanMinAgeMs,
} from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";

describe("findOrphanStorageKeys", () => {
  const now = 1_700_000_000_000;
  const dayMs = 24 * 60 * 60 * 1000;

  it("returns unreferenced files older than minAgeMs", () => {
    const referenced = new Set(["avatars/keep.png"]);
    const onDisk = [
      { storageKey: "avatars/keep.png", mtimeMs: now - dayMs * 2 },
      { storageKey: "avatars/orphan.png", mtimeMs: now - dayMs * 2 },
      { storageKey: "puck-blocks/fresh.png", mtimeMs: now - 1000 },
    ];

    const result = findOrphanStorageKeys(referenced, onDisk, dayMs, now);
    assert.deepEqual(result.orphans, ["avatars/orphan.png"]);
    assert.equal(result.skippedRecentCount, 1);
  });

  it("keeps referenced files regardless of age", () => {
    const referenced = new Set(["avatars/keep.png"]);
    const onDisk = [{ storageKey: "avatars/keep.png", mtimeMs: now - 1000 }];
    const result = findOrphanStorageKeys(referenced, onDisk, dayMs, now);
    assert.deepEqual(result.orphans, []);
    assert.equal(result.skippedRecentCount, 0);
  });
});

describe("readOrphanMinAgeMs", () => {
  it("defaults to 24 hours", () => {
    assert.equal(readOrphanMinAgeMs({}), 24 * 60 * 60 * 1000);
  });

  it("reads MEDIA_ORPHAN_MIN_AGE_HOURS", () => {
    assert.equal(
      readOrphanMinAgeMs({ MEDIA_ORPHAN_MIN_AGE_HOURS: "2" }),
      2 * 60 * 60 * 1000,
    );
  });
});
