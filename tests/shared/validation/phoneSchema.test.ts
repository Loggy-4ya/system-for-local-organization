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
  autocorrectPhoneInput,
  filterPhoneInputChange,
  normalizePhoneInput,
  optionalPhoneSchema,
  requiredPhoneSchema,
} from "@shared/validation/phoneSchema";

describe("stripPhoneInputToAllowedChars / normalizePhoneInput", () => {
  it("strips HTML and script tags before storage", () => {
    assert.equal(
      normalizePhoneInput("+12025551234<script>alert(1)</script>"),
      "+12025551234",
    );
    assert.equal(normalizePhoneInput("<img src=x onerror=alert(1)>442071234567"), "+442071234567");
    assert.doesNotMatch(normalizePhoneInput("+12025551234<script>alert(1)</script>") ?? "", /script|alert|[<>]/i);
  });

  it("strips control characters", () => {
    assert.equal(normalizePhoneInput("4420\u000071234567"), "+442071234567");
  });

  it("returns null when no digits remain after stripping", () => {
    assert.equal(normalizePhoneInput("<script>alert(1)</script>"), null);
    assert.equal(normalizePhoneInput("<script></script>"), null);
    assert.equal(normalizePhoneInput("---"), null);
  });

  it("drops short digit runs left from stripped markup", () => {
    assert.equal(normalizePhoneInput("<script>alert(1)</script>442071234567"), "+442071234567");
  });

  it("canonicalizes spaced international input to +digits", () => {
    assert.equal(normalizePhoneInput("  +44 20 7123 4567  "), "+442071234567");
  });
});

describe("autocorrectPhoneInput", () => {
  it("adds + to numbers entered without an international prefix", () => {
    assert.equal(autocorrectPhoneInput("442071234567"), "+442071234567");
  });

  it("preserves explicit international numbers", () => {
    assert.equal(autocorrectPhoneInput("+12025551234"), "+12025551234");
  });

  it("does not infer a local country calling code from trunk 0", () => {
    assert.equal(autocorrectPhoneInput("02071234567"), "+02071234567");
  });

  it("rejects numbers that are too short after stripping", () => {
    assert.equal(autocorrectPhoneInput("123456"), null);
  });
});

describe("filterPhoneInputChange", () => {
  it("matches server-side stripping for live inputs", () => {
    assert.equal(filterPhoneInputChange("+44<script>20"), "+4420");
  });

  it("does not autocorrect while typing", () => {
    assert.equal(filterPhoneInputChange("0207"), "0207");
  });
});

describe("optionalPhoneSchema", () => {
  it("accepts sanitized phone values", () => {
    const parsed = optionalPhoneSchema.safeParse("+12025551234");
    assert.equal(parsed.success, true);
  });

  it("autocorrects international numbers missing + on parse", () => {
    const parsed = optionalPhoneSchema.safeParse("442071234567");
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data, "+442071234567");
    }
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
    const parsed = optionalPhoneSchema.safeParse("442071234567<script>");
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data, "+442071234567");
    }
  });
});
