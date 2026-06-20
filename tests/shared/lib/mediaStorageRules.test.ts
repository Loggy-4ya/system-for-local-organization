/**
 * @fileoverview Unit tests for media storage validation rules.
 *
 * Run: npm run test:media-storage
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertMediaUploadAllowed,
  buildLocalPublicUrl,
  buildStoredFilename,
  MediaStorageValidationError,
  parseMediaPurpose,
  resolveMediaKind,
} from "@shared/lib/mediaStorage/mediaStorageRules";

describe("resolveMediaKind", () => {
  it("detects image and video MIME types", () => {
    assert.equal(resolveMediaKind("image/png"), "image");
    assert.equal(resolveMediaKind("video/mp4"), "video");
    assert.equal(resolveMediaKind("text/plain"), null);
  });
});

describe("parseMediaPurpose", () => {
  it("defaults unknown or empty values to puck-block", () => {
    assert.equal(parseMediaPurpose(undefined), "puck-block");
    assert.equal(parseMediaPurpose(""), "puck-block");
    assert.equal(parseMediaPurpose("not-real"), "puck-block");
  });

  it("accepts valid purpose strings", () => {
    assert.equal(parseMediaPurpose("avatar"), "avatar");
    assert.equal(parseMediaPurpose(" task-report "), "task-report");
  });
});

describe("assertMediaUploadAllowed", () => {
  it("rejects videos for avatar purpose", () => {
    assert.throws(
      () =>
        assertMediaUploadAllowed({
          purpose: "avatar",
          mimeType: "video/mp4",
          sizeBytes: 1000,
          bufferLength: 1000,
        }),
      (err: unknown) =>
        err instanceof MediaStorageValidationError &&
        err.message.includes("accepts image"),
    );
  });

  it("enforces avatar image size limit", () => {
    const overLimit = 3 * 1024 * 1024;
    assert.throws(
      () =>
        assertMediaUploadAllowed({
          purpose: "avatar",
          mimeType: "image/png",
          sizeBytes: overLimit,
          bufferLength: overLimit,
        }),
      (err: unknown) => err instanceof MediaStorageValidationError,
    );
  });

  it("allows puck-block videos within limit", () => {
    assert.equal(
      assertMediaUploadAllowed({
        purpose: "puck-block",
        mimeType: "video/webm",
        sizeBytes: 1024,
        bufferLength: 1024,
      }),
      "video",
    );
  });

  it("rejects SVG uploads", () => {
    assert.throws(
      () =>
        assertMediaUploadAllowed({
          purpose: "puck-block",
          mimeType: "image/svg+xml",
          sizeBytes: 512,
          bufferLength: 512,
        }),
      (err: unknown) =>
        err instanceof MediaStorageValidationError &&
        err.message.includes("SVG"),
    );
  });
});

describe("buildStoredFilename", () => {
  it("sanitizes unsafe characters and preserves extension", () => {
    const name = buildStoredFilename("My Photo!!!.png", "image/png", "image");
    assert.match(name, /^My-Photo-\d+-\d+\.png$/);
  });

  it("falls back to MIME extension when filename has none", () => {
    const name = buildStoredFilename("upload", "image/jpeg", "image");
    assert.match(name, /\.jpg$/);
  });
});

describe("buildLocalPublicUrl", () => {
  it("builds root-relative upload URLs", () => {
    assert.equal(
      buildLocalPublicUrl("avatars", "user-1.png"),
      "/uploads/avatars/user-1.png",
    );
  });
});
