/**
 * @fileoverview Tests for page publication visibility helpers.
 *
 * Module under test: shared/lib/pagePublicationLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-publication`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineDateAndTime,
  isPagePubliclyVisible,
  publishPageIdempotencyKey,
  shouldPublishImmediately,
} from "@shared/lib/pagePublicationLogic";

describe("isPagePubliclyVisible", () => {
  it("requires published flag and past publishAt", () => {
    const now = new Date("2026-06-21T12:00:00.000Z");
    assert.equal(isPagePubliclyVisible({ published: false, publishAt: null }, now), false);
    assert.equal(
      isPagePubliclyVisible(
        { published: true, publishAt: "2026-06-22T12:00:00.000Z" },
        now,
      ),
      false,
    );
    assert.equal(
      isPagePubliclyVisible(
        { published: true, publishAt: "2026-06-20T12:00:00.000Z" },
        now,
      ),
      true,
    );
    assert.equal(isPagePubliclyVisible({ published: true, publishAt: null }, now), true);
  });
});

describe("shouldPublishImmediately", () => {
  it("treats null publishAt as immediate", () => {
    const now = new Date("2026-06-21T12:00:00.000Z");
    assert.equal(shouldPublishImmediately(null, now), true);
    assert.equal(shouldPublishImmediately("2026-06-20T12:00:00.000Z", now), true);
    assert.equal(shouldPublishImmediately("2026-06-22T12:00:00.000Z", now), false);
  });
});

describe("publishPageIdempotencyKey", () => {
  it("builds stable keys", () => {
    assert.equal(publishPageIdempotencyKey("/news"), "publish_page:/news");
  });
});

describe("combineDateAndTime", () => {
  it("merges wall-clock time into a calendar day", () => {
    const day = new Date("2026-06-21T00:00:00");
    const combined = combineDateAndTime(day, "14:30");
    assert.ok(combined);
    assert.equal(combined.getHours(), 14);
    assert.equal(combined.getMinutes(), 30);
  });
});
