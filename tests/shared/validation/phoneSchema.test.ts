/**
 * @fileoverview Unit tests for phone normalization and validation.
 *
 * Module under test: shared/validation/phoneSchema.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:phone-schema`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPhoneInputChange,
  normalizePhoneInput,
  optionalPhoneSchema,
  requiredPhoneSchema,
} from "@shared/validation/phoneSchema";

describe("stripPhoneInputToAllowedChars / normalizePhoneInput", () => {
  it("strips HTML and script tags before storage", () => {
    assert.equal(
      normalizePhoneInput("+380501234567<script>alert(1)</script>"),
      "+380501234567",
    );
    assert.equal(normalizePhoneInput("<img src=x onerror=alert(1)>380501234567"), "380501234567");
    assert.doesNotMatch(normalizePhoneInput("+380501234567<script>alert(1)</script>") ?? "", /script|alert|[<>]/i);
  });

  it("strips control characters", () => {
    assert.equal(normalizePhoneInput("380\u0000501234567"), "380501234567");
  });

  it("returns null when no digits remain after stripping", () => {
    assert.equal(normalizePhoneInput("<script>alert(1)</script>"), null);
    assert.equal(normalizePhoneInput("<script></script>"), null);
    assert.equal(normalizePhoneInput("---"), null);
  });

  it("drops short digit runs left from stripped markup", () => {
    assert.equal(normalizePhoneInput("<script>alert(1)</script>380501234567"), "380501234567");
  });

  it("preserves valid international formatting", () => {
    assert.equal(normalizePhoneInput("  +380 50 123 45 67  "), "+380 50 123 45 67");
  });
});

describe("filterPhoneInputChange", () => {
  it("matches server-side stripping for live inputs", () => {
    assert.equal(filterPhoneInputChange("+380<script>50"), "+38050");
  });
});

describe("optionalPhoneSchema", () => {
  it("accepts sanitized phone values", () => {
    const parsed = optionalPhoneSchema.safeParse("+380501234567");
    assert.equal(parsed.success, true);
  });

  it("maps markup-only optional phone input to null", () => {
    const parsed = optionalPhoneSchema.safeParse("<script>alert(1)</script>");
    assert.equal(parsed.success, true);
    assert.equal(parsed.data, null);

    const boldTag = optionalPhoneSchema.safeParse("<b>x</b>");
    assert.equal(boldTag.success, true);
    assert.equal(boldTag.data, null);
  });

  it("rejects markup-only input for required phone", () => {
    const parsed = requiredPhoneSchema.safeParse("<script>alert(1)</script>");
    assert.equal(parsed.success, false);
  });

  it("normalizes pasted markup around a valid number", () => {
    const parsed = optionalPhoneSchema.safeParse("380501234567<script>");
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data, "380501234567");
    }
  });
});
