/**
 * @fileoverview Unit tests for Puck layout content-policy scanning.
 *
 * Module under test: shared/lib/puckContentPolicy.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:puck-content-policy`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFirstPuckContentPolicyViolation,
  scanPuckDataContentPolicy,
} from "@shared/lib/puckContentPolicy";

describe("scanPuckDataContentPolicy", () => {
  it("flags blocked words in plain text props", () => {
    const violations = scanPuckDataContentPolicy({
      content: [
        {
          type: "NexusHeading",
          props: { text: "what the fuck" },
        },
      ],
    });
    assert.ok(violations.length > 0);
    assert.match(violations[0]!.path, /text$/);
  });

  it("flags blocked words in rich text HTML props", () => {
    const violation = getFirstPuckContentPolicyViolation({
      content: [
        {
          type: "NexusText",
          props: { text: "<p>oh <strong>shit</strong></p>" },
        },
      ],
    });
    assert.ok(violation);
  });

  it("skips URL and media props", () => {
    const violations = scanPuckDataContentPolicy({
      content: [
        {
          type: "NexusButton",
          props: { href: "https://example.com/fuck", label: "Visit" },
        },
      ],
    });
    assert.equal(violations.length, 0);
  });

  it("accepts clean copy", () => {
    const violations = scanPuckDataContentPolicy({
      content: [
        {
          type: "NexusHeading",
          props: { text: "Welcome to Nexus" },
        },
      ],
    });
    assert.equal(violations.length, 0);
  });
});
