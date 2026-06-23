/**
 * @fileoverview Unit tests for upload reference parsing helpers.
 *
 * Run: npm run test:upload-reference-utils
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGcsPublicUrl,
} from "@shared/lib/mediaStorage/gcsObjectKey";
import {
  collectUploadStorageKeysFromValue,
  mediaUrlToStorageKey,
  publicUploadPathToStorageKey,
} from "@shared/lib/mediaStorage/uploadReferenceUtils";

describe("publicUploadPathToStorageKey", () => {
  it("parses root-relative upload paths", () => {
    assert.equal(
      publicUploadPathToStorageKey("/uploads/avatars/user-1.png"),
      "avatars/user-1.png",
    );
    assert.equal(
      publicUploadPathToStorageKey("/uploads/puck-blocks/slide-123.webp"),
      "puck-blocks/slide-123.webp",
    );
  });

  it("parses absolute same-site URLs", () => {
    assert.equal(
      publicUploadPathToStorageKey("https://nexus.example/uploads/page-covers/hero.jpg"),
      "page-covers/hero.jpg",
    );
  });

  it("rejects unknown segments and traversal", () => {
    assert.equal(publicUploadPathToStorageKey("/uploads/evil/../avatars/x.png"), null);
    assert.equal(publicUploadPathToStorageKey("/uploads/unknown/file.png"), null);
    assert.equal(publicUploadPathToStorageKey("https://cdn.example.com/photo.png"), null);
  });
});

describe("collectUploadStorageKeysFromValue", () => {
  it("walks nested Puck-like JSON", () => {
    const keys = new Set<string>();
    collectUploadStorageKeysFromValue(
      {
        content: [
          {
            props: {
              image: "/uploads/puck-blocks/a.png",
              url: "https://youtube.com/watch?v=abc",
            },
          },
        ],
        root: {
          pageBackground: {
            backgroundImage: "/uploads/page-covers/cover.jpg",
          },
        },
      },
      keys,
    );

    assert.deepEqual([...keys].sort(), [
      "page-covers/cover.jpg",
      "puck-blocks/a.png",
    ]);
  });
});

describe("mediaUrlToStorageKey — GCS/CDN", () => {
  const context = {
    gcsBucket: "nexus-media-prod",
    gcsPublicBaseUrl: "https://cdn.nexus.example/media",
  };

  it("parses storage.googleapis.com URLs", () => {
    assert.equal(
      mediaUrlToStorageKey(
        "https://storage.googleapis.com/nexus-media-prod/avatars/user-1.png",
        context,
      ),
      "avatars/user-1.png",
    );
  });

  it("parses CDN base URLs", () => {
    assert.equal(
      mediaUrlToStorageKey("https://cdn.nexus.example/media/puck-blocks/a.webp", context),
      "puck-blocks/a.webp",
    );
  });

  it("rejects bucket mismatches", () => {
    assert.equal(
      mediaUrlToStorageKey(
        "https://storage.googleapis.com/other-bucket/avatars/user-1.png",
        context,
      ),
      null,
    );
  });
});

describe("mediaUrlToStorageKey — S3/CDN", () => {
  const context = {
    s3Bucket: "nexus-media-prod",
    s3Region: "eu-central-1",
    s3PublicBaseUrl: "https://cdn.nexus.example/media",
  };

  it("parses virtual-hosted S3 URLs", () => {
    assert.equal(
      mediaUrlToStorageKey(
        "https://nexus-media-prod.s3.eu-central-1.amazonaws.com/avatars/user-1.png",
        context,
      ),
      "avatars/user-1.png",
    );
  });

  it("parses path-style S3 URLs", () => {
    assert.equal(
      mediaUrlToStorageKey(
        "https://s3.eu-central-1.amazonaws.com/nexus-media-prod/puck-blocks/a.webp",
        context,
      ),
      "puck-blocks/a.webp",
    );
  });

  it("parses S3 CDN base URLs", () => {
    assert.equal(
      mediaUrlToStorageKey("https://cdn.nexus.example/media/page-covers/hero.jpg", context),
      "page-covers/hero.jpg",
    );
  });

  it("rejects S3 bucket mismatches", () => {
    assert.equal(
      mediaUrlToStorageKey(
        "https://other-bucket.s3.eu-central-1.amazonaws.com/avatars/user-1.png",
        context,
      ),
      null,
    );
  });
});

describe("buildS3PublicUrl", () => {
  it("uses CDN base when configured", async () => {
    const { buildS3PublicUrl } = await import("@shared/lib/mediaStorage/s3ObjectKey");
    assert.equal(
      buildS3PublicUrl("avatars/a.png", "bucket", "eu-central-1", "https://cdn.example.com/media"),
      "https://cdn.example.com/media/avatars/a.png",
    );
  });

  it("falls back to virtual-hosted S3 URLs", async () => {
    const { buildS3PublicUrl } = await import("@shared/lib/mediaStorage/s3ObjectKey");
    assert.equal(
      buildS3PublicUrl("avatars/a.png", "my-bucket", "eu-central-1"),
      "https://my-bucket.s3.eu-central-1.amazonaws.com/avatars/a.png",
    );
    assert.equal(
      buildS3PublicUrl("avatars/a.png", "my-bucket", "us-east-1"),
      "https://my-bucket.s3.amazonaws.com/avatars/a.png",
    );
  });
});

describe("buildGcsPublicUrl", () => {
  it("uses CDN base when configured", () => {
    assert.equal(
      buildGcsPublicUrl("avatars/a.png", "bucket", "https://cdn.example.com/media"),
      "https://cdn.example.com/media/avatars/a.png",
    );
  });

  it("falls back to storage.googleapis.com", () => {
    assert.equal(
      buildGcsPublicUrl("avatars/a.png", "my-bucket"),
      "https://storage.googleapis.com/my-bucket/avatars/a.png",
    );
  });
});
