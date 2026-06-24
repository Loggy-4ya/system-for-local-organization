/**
 * Run: npm run test:nexus-editor-content
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for Nexus rich text HTML sanitization and mention anchors.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mentionBadgeClassName,
  parseMentionAnchorAttributes,
  sanitizeNexusEditorHtml,
  serializeMentionAnchor,
} from "@/lib/nexusEditor/nexusEditorContent";

describe("serializeMentionAnchor", () => {
  it("renders a user mention badge anchor", () => {
    const html = serializeMentionAnchor({
      mentionType: "user",
      id: "abc123",
      label: "Anna Koval",
      href: "/users/abc123",
    });

    assert.match(html, /data-nexus-mention/);
    assert.match(html, /data-mention-type="user"/);
    assert.match(html, /@Anna Koval/);
  });

  it("adds data-page-path for page mentions", () => {
    const html = serializeMentionAnchor({
      mentionType: "page",
      id: "page1",
      label: "News",
      href: "/news",
    });

    assert.match(html, /data-page-path="\/news"/);
    assert.match(html, /nexus-mention--page/);
  });
});

describe("sanitizeNexusEditorHtml", () => {
  it("strips script tags", () => {
    const out = sanitizeNexusEditorHtml('<p>Hi</p><script>alert(1)</script>');
    assert.equal(out, "<p>Hi</p>");
  });

  it("preserves safe mention anchors", () => {
    const input = serializeMentionAnchor({
      mentionType: "user",
      id: "u1",
      label: "Test User",
      href: "/users/u1",
    });
    const wrapped = `<p>Hello ${input}!</p>`;
    const out = sanitizeNexusEditorHtml(wrapped);
    assert.match(out, /data-nexus-mention/);
    assert.match(out, /@Test User/);
    assert.doesNotMatch(out, /@Test User@/);
    assert.doesNotMatch(out, /<\/a>@/);
  });

  it("does not duplicate mention closing tags in inline body copy", () => {
    const input = serializeMentionAnchor({
      mentionType: "user",
      id: "u1",
      label: "admin",
      href: "/users/admin",
    });
    const wrapped = `<p>Hello ${input} world</p>`;
    const out = sanitizeNexusEditorHtml(wrapped);
    assert.equal(
      out,
      `<p>Hello <a href="/users/admin" data-nexus-mention="" data-mention-type="user" data-id="u1" data-label="admin" class="nexus-mention nexus-mention--user">@admin</a> world</p>`,
    );
  });

  it("repairs orphan @ before mention anchors", () => {
    const input =
      '<p>Hello @ <a href="/users/admin" data-nexus-mention="" data-mention-type="user" data-id="u1" data-label="admin" class="nexus-mention nexus-mention--user">@admin</a> world</p>';
    const out = sanitizeNexusEditorHtml(input);
    assert.equal(
      out,
      `<p>Hello <a href="/users/admin" data-nexus-mention="" data-mention-type="user" data-id="u1" data-label="admin" class="nexus-mention nexus-mention--user">@admin</a> world</p>`,
    );
  });

  it("repairs duplicate @label tails after mention anchors", () => {
    const input =
      '<p>Hello <a href="/users/admin" data-nexus-mention="" data-mention-type="user" data-id="u1" data-label="admin" class="nexus-mention nexus-mention--user">@admin</a>@admin world</p>';
    const out = sanitizeNexusEditorHtml(input);
    assert.equal(
      out,
      `<p>Hello <a href="/users/admin" data-nexus-mention="" data-mention-type="user" data-id="u1" data-label="admin" class="nexus-mention nexus-mention--user">@admin</a> world</p>`,
    );
  });

  it("unwraps unsafe mention hrefs", () => {
    const input =
      '<a href="javascript:alert(1)" data-nexus-mention data-mention-type="user" data-id="x" data-label="Bad">@Bad</a>';
    const out = sanitizeNexusEditorHtml(`<p>${input}</p>`);
    assert.doesNotMatch(out, /data-nexus-mention/);
    assert.match(out, /@Bad/);
  });

  it("keeps StarterKit bold tags", () => {
    const out = sanitizeNexusEditorHtml("<p><strong>Bold</strong></p>");
    assert.match(out, /<strong>Bold<\/strong>/);
  });

  it("strips TipTap dir attributes for SSR/client parity", () => {
    const out = sanitizeNexusEditorHtml(
      '<p dir="auto">This is a paragraph of body text. You can edit this text inline or in the sidebar.</p>',
    );
    assert.equal(
      out,
      "<p>This is a paragraph of body text. You can edit this text inline or in the sidebar.</p>",
    );
    assert.doesNotMatch(out, /dir=/);
  });
});

describe("mentionBadgeClassName", () => {
  it("maps mention types to modifier classes", () => {
    assert.equal(mentionBadgeClassName("user"), "nexus-mention nexus-mention--user");
    assert.equal(mentionBadgeClassName("page"), "nexus-mention nexus-mention--page");
  });
});

describe("parseMentionAnchorAttributes", () => {
  it("returns null for invalid mention type", () => {
    if (typeof DOMParser === "undefined") {
      return;
    }

    const doc = new DOMParser().parseFromString(
      '<a data-nexus-mention data-mention-type="evil" data-id="1" data-label="X" href="/x">@X</a>',
      "text/html",
    );
    const anchor = doc.querySelector("a");
    assert.ok(anchor);
    assert.equal(parseMentionAnchorAttributes(anchor as HTMLAnchorElement), null);
  });
});
