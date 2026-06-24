/**
 * @fileoverview Unit tests for Puck background draft autosave scheduling.
 *
 * Run: `npm run test:puck-draft-autosave`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fingerprintPuckDraftData,
  resolvePuckDraftSaveStatus,
  shouldAttemptPuckDraftAutosave,
} from "@shared/lib/puckDraftAutosaveLogic";
import type { Data } from "@puckeditor/core";

const SAMPLE: Data = {
  root: { props: { title: "A" } },
  content: [],
  zones: {},
};

describe("fingerprintPuckDraftData", () => {
  it("returns stable JSON for the same document", () => {
    const a = fingerprintPuckDraftData(SAMPLE);
    const b = fingerprintPuckDraftData({ ...SAMPLE });
    assert.equal(a, b);
  });

  it("changes when content mutates", () => {
    const before = fingerprintPuckDraftData(SAMPLE);
    const after = fingerprintPuckDraftData({
      ...SAMPLE,
      content: [{ type: "NexusText", props: { id: "1" } }],
    });
    assert.notEqual(before, after);
  });
});

describe("shouldAttemptPuckDraftAutosave", () => {
  const base = {
    disabled: false,
    saveInFlight: false,
    lastEditAt: 0,
    lastTickAt: 0,
    now: 20_000,
    quietMs: 2_500,
    intervalMs: 12_000,
    currentFingerprint: "draft",
    lastSavedFingerprint: "saved",
  };

  it("skips when disabled or in flight", () => {
    assert.equal(shouldAttemptPuckDraftAutosave({ ...base, disabled: true }), false);
    assert.equal(shouldAttemptPuckDraftAutosave({ ...base, saveInFlight: true }), false);
  });

  it("skips when document matches last save", () => {
    assert.equal(
      shouldAttemptPuckDraftAutosave({
        ...base,
        currentFingerprint: "same",
        lastSavedFingerprint: "same",
      }),
      false,
    );
  });

  it("waits for quiet period after last edit", () => {
    assert.equal(
      shouldAttemptPuckDraftAutosave({
        ...base,
        lastEditAt: 19_000,
        now: 20_000,
      }),
      false,
    );
  });

  it("waits for interval between ticks", () => {
    assert.equal(
      shouldAttemptPuckDraftAutosave({
        ...base,
        lastEditAt: 0,
        lastTickAt: 15_000,
        now: 20_000,
      }),
      false,
    );
  });

  it("allows save when dirty, idle, and interval elapsed", () => {
    assert.equal(
      shouldAttemptPuckDraftAutosave({
        ...base,
        lastEditAt: 0,
        lastTickAt: 0,
        now: 20_000,
      }),
      true,
    );
  });
});

describe("resolvePuckDraftSaveStatus", () => {
  it("prioritises saving over dirty", () => {
    assert.equal(
      resolvePuckDraftSaveStatus({ dirty: true, saveInFlight: true }),
      "saving",
    );
  });

  it("reports unsaved when dirty and idle", () => {
    assert.equal(
      resolvePuckDraftSaveStatus({ dirty: true, saveInFlight: false }),
      "unsaved",
    );
  });

  it("reports saved when clean", () => {
    assert.equal(
      resolvePuckDraftSaveStatus({ dirty: false, saveInFlight: false }),
      "saved",
    );
  });
});
