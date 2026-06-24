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
  resolvePublicationStateOnSave,
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

describe("resolvePublicationStateOnSave", () => {
  const now = new Date("2026-06-21T12:00:00.000Z");

  it("keeps new pages as drafts on save", () => {
    const state = resolvePublicationStateOnSave({
      requestPublish: false,
      publishAt: null,
      now,
    });
    assert.equal(state.published, false);
    assert.equal(state.publishAt, null);
    assert.equal(state.scheduledFuture, false);
  });

  it("preserves live publication on draft save", () => {
    const state = resolvePublicationStateOnSave({
      requestPublish: false,
      publishAt: "2026-06-22T12:00:00.000Z",
      existingPublished: true,
      existingPublishAt: null,
      now,
    });
    assert.equal(state.published, true);
    assert.equal(state.publishAt, null);
    assert.equal(state.scheduledFuture, false);
  });

  it("publishes immediately when requested without schedule", () => {
    const state = resolvePublicationStateOnSave({
      requestPublish: true,
      publishAt: null,
      now,
    });
    assert.equal(state.published, true);
    assert.equal(state.publishAt, null);
    assert.equal(state.scheduledFuture, false);
  });

  it("schedules future publish when requested", () => {
    const state = resolvePublicationStateOnSave({
      requestPublish: true,
      publishAt: "2026-06-22T12:00:00.000Z",
      now,
    });
    assert.equal(state.published, false);
    assert.equal(state.scheduledFuture, true);
    assert.equal(state.publishAt?.toISOString(), "2026-06-22T12:00:00.000Z");
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
