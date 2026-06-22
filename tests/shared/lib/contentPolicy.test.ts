/**
 * @fileoverview Unit tests for content policy blocklist and weak-password checks.
 *
 * Module under test: shared/lib/contentPolicy.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:content-policy`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsBlockedWord,
  containsBlockedWordInRichText,
  containsBlockedWordInStoredText,
  getBlockedWordError,
  getWeakPolicyPasswordError,
  isWeakPolicyPassword,
  maskBlockedWords,
  normalizeContentPolicyText,
  scanContentPolicyText,
} from "@shared/lib/contentPolicy";

describe("normalizeContentPolicyText", () => {
  it("lowercases and collapses whitespace", () => {
    assert.equal(normalizeContentPolicyText("  Hello   World  "), "hello world");
  });

  it("maps common leetspeak to letters", () => {
    assert.equal(normalizeContentPolicyText("f@ck"), "fack");
    assert.equal(normalizeContentPolicyText("sh1t"), "shit");
  });
});

describe("scanContentPolicyText", () => {
  it("detects blocked words with word boundaries", () => {
    assert.equal(containsBlockedWord("what the fuck"), true);
    assert.equal(containsBlockedWord("classic music"), false);
  });

  it("is case insensitive", () => {
    assert.equal(containsBlockedWord("FUCK"), true);
  });

  it("detects leetspeak variants after normalisation", () => {
    assert.equal(containsBlockedWord("sh1t happens"), true);
  });

  it("returns structured matches", () => {
    const result = scanContentPolicyText("oh shit");
    assert.equal(result.hasBlockedWord, true);
    assert.equal(result.matches[0]?.term, "shit");
    assert.equal(result.matches[0]?.category, "profanity");
  });

  it("accepts custom blocklists", () => {
    assert.equal(
      containsBlockedWord("forbidden token", {
        blockedWords: [{ term: "forbidden", category: "other" }],
      }),
      true,
    );
  });
});

describe("getBlockedWordError", () => {
  it("returns null for clean text", () => {
    assert.equal(getBlockedWordError("Welcome to Nexus"), null);
  });

  it("returns default message for violations", () => {
    assert.ok(getBlockedWordError("bad shit here"));
  });
});

describe("maskBlockedWords", () => {
  it("masks matched terms in place", () => {
    assert.equal(maskBlockedWords("what the fuck"), "what the ****");
  });
});

describe("weak password policy", () => {
  it("flags denylisted passwords", () => {
    assert.equal(isWeakPolicyPassword("password123"), true);
    assert.equal(isWeakPolicyPassword("River-2026!"), false);
  });

  it("returns user-facing weak password error", () => {
    assert.ok(getWeakPolicyPasswordError("admin123"));
    assert.equal(getWeakPolicyPasswordError("Unique-Pass-9!"), null);
  });
});

describe("rich text and stored text helpers", () => {
  it("extracts plain text from HTML for scanning", () => {
    assert.equal(
      containsBlockedWordInRichText("<p>what the <strong>fuck</strong></p>"),
      true,
    );
  });

  it("auto-detects HTML in stored text helper", () => {
    assert.equal(containsBlockedWordInStoredText("<p>shit</p>"), true);
    assert.equal(containsBlockedWordInStoredText("clean prose"), false);
  });
});
