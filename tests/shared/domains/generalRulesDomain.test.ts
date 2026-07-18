/**
 * @fileoverview Unit tests for general rules domain and list parsing.
 *
 * Module under test: shared/domains/GeneralRulesDomain.ts, shared/lib/generalRulesListParsing.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:general-rules-domain`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBlockedWordsTextarea,
  parseWeakPasswordsTextarea,
  serializeBlockedWordsTextarea,
} from "@shared/lib/generalRulesListParsing";
import {
  buildEffectiveGeneralRulesFromConstants,
  buildEffectiveGeneralRulesSnapshot,
  invalidateEffectiveGeneralRulesCache,
  setEffectiveGeneralRulesCache,
} from "@shared/lib/effectiveGeneralRulesCache";
import {
  interpolateTelegramMessageTemplate,
} from "@shared/constants/generalRules";
import { buildDefaultTelegramMessageTemplatesByLocale } from "@shared/constants/botMessageDefaults";
import { containsBlockedWord } from "@shared/lib/contentPolicy";
import { formatTelegramBroadcastMessage } from "@shared/lib/telegramBroadcastFormat";

describe("generalRulesListParsing", () => {
  it("parses blocked words with optional categories", () => {
    const rows = parseBlockedWordsTextarea("alpha\nbeta | profanity\n# comment\n");
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.term, "alpha");
    assert.equal(rows[1]?.category, "profanity");
  });

  it("round-trips blocked words textarea", () => {
    const input = "alpha\nbeta | slur";
    const serialized = serializeBlockedWordsTextarea(parseBlockedWordsTextarea(input));
    assert.match(serialized, /alpha/);
    assert.match(serialized, /beta \| slur/);
  });

  it("parses weak passwords one per line", () => {
    assert.deepEqual(parseWeakPasswordsTextarea("pass1\npass2\n"), ["pass1", "pass2"]);
  });
});

describe("effective general rules cache", () => {
  it("applies custom blocked words through content policy scans", () => {
    invalidateEffectiveGeneralRulesCache();
    const snapshot = buildEffectiveGeneralRulesSnapshot({
      blockedWords: [{ term: "badword", category: "other" }],
      weakPasswords: [],
      blockedWordMessage: "Nope.",
      weakPasswordMessage: "Weak.",
      telegramMessagesByLocale: buildDefaultTelegramMessageTemplatesByLocale(),
    });

    setEffectiveGeneralRulesCache(snapshot);

    assert.equal(containsBlockedWord("this badword here"), true);
    invalidateEffectiveGeneralRulesCache();
  });
});

describe("telegramBroadcastFormat", () => {
  it("interpolates broadcast template placeholders", () => {
    const text = interpolateTelegramMessageTemplate("📢 {title}\n\n{body}", {
      title: "Hello",
      body: "World",
    });
    assert.match(text, /Hello/);
    assert.match(text, /World/);
  });

  it("formats body-only broadcasts", () => {
    invalidateEffectiveGeneralRulesCache();
    setEffectiveGeneralRulesCache(buildEffectiveGeneralRulesFromConstants());

    assert.equal(formatTelegramBroadcastMessage(null, "Update"), "📢 Update");
    invalidateEffectiveGeneralRulesCache();
  });
});
