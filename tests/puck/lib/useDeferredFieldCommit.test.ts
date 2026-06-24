/**
 * @fileoverview Deferred Puck field commit resolution.
 *
 * Module under test: src/components/puck/lib/useDeferredFieldCommit.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:deferred-field-commit`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDeferredFieldCommit } from "@/components/puck/lib/useDeferredFieldCommit";

describe("resolveDeferredFieldCommit", () => {
  it("commits the ref draft when it differs from the external value", () => {
    const result = resolveDeferredFieldCommit("New Title", "Old Title");
    assert.equal(result.resolved, "New Title");
    assert.equal(result.shouldCommit, true);
  });

  it("skips commit when ref draft matches the external value", () => {
    const result = resolveDeferredFieldCommit("Same Title", "Same Title");
    assert.equal(result.shouldCommit, false);
  });

  it("prefers an explicit next value over the ref draft", () => {
    const result = resolveDeferredFieldCommit("Stale Render Draft", "Old Title", "Typed Title");
    assert.equal(result.resolved, "Typed Title");
    assert.equal(result.shouldCommit, true);
  });
});
