/**
 * Run: npm run test:safe-href
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for safe hyperlink validation.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeHref, sanitizeUserHref } from "@shared/lib/safeHref";
import { isSafeMediaUrl, sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";

describe("isSafeHref", () => {
  it("allows same-origin paths and fragments", () => {
    assert.equal(isSafeHref("/news"), true);
    assert.equal(isSafeHref("#section"), true);
  });

  it("allows http(s), mailto, and tel", () => {
    assert.equal(isSafeHref("https://example.com/x"), true);
    assert.equal(isSafeHref("mailto:hi@example.com"), true);
    assert.equal(isSafeHref("tel:+380501234567"), true);
  });

  it("rejects javascript, data, and protocol-relative URLs", () => {
    assert.equal(isSafeHref("javascript:alert(1)"), false);
    assert.equal(isSafeHref("data:text/html,<script>alert(1)</script>"), false);
    assert.equal(isSafeHref("//evil.com"), false);
  });
});

describe("sanitizeUserHref", () => {
  it("returns empty string for unsafe values", () => {
    assert.equal(sanitizeUserHref("javascript:alert(1)"), "");
    assert.equal(sanitizeUserHref(null), "");
  });

  it("returns trimmed safe href", () => {
    assert.equal(sanitizeUserHref(" /news "), "/news");
  });
});

describe("sanitizeMediaUrl", () => {
  it("allows managed upload paths", () => {
    assert.equal(
      sanitizeMediaUrl("/uploads/puck-blocks/photo.png"),
      "/uploads/puck-blocks/photo.png",
    );
  });

  it("allows HTTPS remote media", () => {
    assert.equal(
      sanitizeMediaUrl("https://cdn.example.com/hero.jpg"),
      "https://cdn.example.com/hero.jpg",
    );
  });

  it("rejects javascript pseudo URLs", () => {
    assert.equal(sanitizeMediaUrl("javascript:alert(1)"), "");
  });
});

describe("isSafeMediaUrl", () => {
  it("recognises GCS storage URLs", () => {
    assert.equal(
      isSafeMediaUrl(
        "https://storage.googleapis.com/nexus-media/puck-blocks/foo.png",
      ),
      true,
    );
  });

  it("recognises S3 storage URLs", () => {
    assert.equal(
      isSafeMediaUrl(
        "https://nexus-media.s3.eu-central-1.amazonaws.com/puck-blocks/foo.png",
      ),
      true,
    );
  });
});
