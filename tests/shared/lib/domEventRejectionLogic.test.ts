/**
 * @fileoverview Unit tests for DOM event rejection detection.
 *
 * Module under test: shared/lib/domEventRejectionLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:dom-event-rejection-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDomEventRejectionReason } from "@shared/lib/domEventRejectionLogic";

describe("isDomEventRejectionReason", () => {
  it("accepts Event instances", () => {
    assert.equal(isDomEventRejectionReason(new Event("error")), true);
  });

  it("accepts error events with resource targets", () => {
    const event = new Event("error");
    Object.defineProperty(event, "target", {
      value: { tagName: "LINK" },
    });
    assert.equal(isDomEventRejectionReason(event), true);
  });

  it("rejects real Error objects", () => {
    assert.equal(isDomEventRejectionReason(new Error("boom")), false);
  });
});
