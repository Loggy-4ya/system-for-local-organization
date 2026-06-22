/**
 * @fileoverview Unit tests for Telegram bot shared-contact phone harvest rules.
 *
 * Module under test: shared/lib/telegramContactHarvestLogic.ts
 *
 * Run: `npm run test:telegram-contact-harvest`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractTelegramContactPhone,
  normalizeTelegramUserId,
  validateTelegramSharedContact,
} from "@shared/lib/telegramContactHarvestLogic";

describe("normalizeTelegramUserId", () => {
  it("coerces numeric strings from webhook JSON", () => {
    assert.equal(normalizeTelegramUserId("42"), 42);
  });
});

describe("extractTelegramContactPhone", () => {
  it("reads phone_number when present", () => {
    assert.equal(
      extractTelegramContactPhone({ phone_number: "+380501234567" }),
      "+380501234567",
    );
  });

  it("falls back to vCard TEL lines", () => {
    assert.equal(
      extractTelegramContactPhone({
        vcard: "BEGIN:VCARD\nTEL;type=CELL:+380501234567\nEND:VCARD",
      }),
      "+380501234567",
    );
  });
});

describe("validateTelegramSharedContact", () => {
  it("accepts the sender's own shared contact", () => {
    const result = validateTelegramSharedContact(42, {
      phone_number: "+380501234567",
      user_id: 42,
      first_name: "Ada",
    });

    assert.equal(result.ok, true);
    assert.equal(result.phone, "+380501234567");
    assert.equal(result.reason, null);
  });

  it("accepts string user_id values from Bot API JSON", () => {
    const result = validateTelegramSharedContact(42, {
      phone_number: "+380501234567",
      user_id: "42",
    });

    assert.equal(result.ok, true);
    assert.equal(result.phone, "+380501234567");
  });

  it("rejects contacts shared on behalf of another user", () => {
    const result = validateTelegramSharedContact(42, {
      phone_number: "+380501234567",
      user_id: 99,
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "self_mismatch");
  });

  it("rejects invalid phone numbers", () => {
    const result = validateTelegramSharedContact(42, {
      phone_number: "abc",
      user_id: 42,
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_phone");
  });
});
