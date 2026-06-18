/**
 * Run: npm run test:nexus-editor-slash
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for slash command catalog filtering.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterSlashCommands,
  scoreSlashCommandMatch,
  DEFAULT_SLASH_COMMANDS,
} from "@/lib/nexusEditor/slashCommandCatalog";

describe("filterSlashCommands", () => {
  it("returns all default commands for an empty query in full variant", () => {
    const results = filterSlashCommands("", "full");
    assert.ok(results.length >= 8);
    assert.ok(results.some((cmd) => cmd.id === "paragraph"));
    assert.ok(results.some((cmd) => cmd.id === "horizontalRule"));
  });

  it("hides full-only commands in minimal variant", () => {
    const results = filterSlashCommands("", "minimal");
    assert.ok(results.some((cmd) => cmd.id === "paragraph"));
    assert.equal(
      results.some((cmd) => cmd.id === "horizontalRule"),
      false,
    );
  });

  it("filters by keyword match", () => {
    const results = filterSlashCommands("bullet", "default");
    assert.equal(results[0]?.id, "bulletList");
  });

  it("returns empty when nothing matches", () => {
    const results = filterSlashCommands("zzzznotfound", "full");
    assert.equal(results.length, 0);
  });
});

describe("scoreSlashCommandMatch", () => {
  it("prefers title prefix matches", () => {
    const command = DEFAULT_SLASH_COMMANDS.find((cmd) => cmd.id === "blockquote");
    assert.ok(command);
    const score = scoreSlashCommandMatch(command, "quo");
    assert.ok(score >= 50);
  });
});
