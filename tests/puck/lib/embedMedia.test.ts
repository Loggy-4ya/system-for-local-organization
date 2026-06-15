/**
 * Run: npm run test:embed-media
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMBED_PROVIDER_ASPECT_RATIO,
  extractVimeoId,
  extractYouTubeId,
  getVideoEmbedProvider,
  getVideoEmbedUrl,
  resolveVideoDisplayAspectRatio,
} from "@/components/puck/lib/embedMedia";
import { normalizeMediaFitMode } from "@/components/puck/lib/mediaFitMode";
import { resolveMediaAspectRatioNumeric } from "@/components/puck/lib/mediaAspectRatio";

describe("embedMedia", () => {
  it("extracts YouTube ids from watch and short URLs", () => {
    assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  it("extracts Vimeo ids", () => {
    assert.equal(extractVimeoId("https://vimeo.com/123456789"), "123456789");
    assert.equal(getVideoEmbedProvider("https://vimeo.com/123456789"), "vimeo");
  });

  it("builds YouTube embed URLs with autoplay and controls flags", () => {
    const url = getVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ", "yes", "no");
    assert.match(url, /youtube\.com\/embed\/dQw4w9WgXcQ/);
    assert.match(url, /autoplay=1/);
    assert.match(url, /controls=0/);
  });

  it("locks embed display aspect ratio to 16:9", () => {
    const ratio = resolveVideoDisplayAspectRatio(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "1-1",
      "1/1",
      resolveMediaAspectRatioNumeric,
    );
    assert.equal(ratio, EMBED_PROVIDER_ASPECT_RATIO);
    assert.ok(Math.abs(ratio - 16 / 9) < 0.001);
  });

  it("uses sidebar aspect ratio for direct file URLs", () => {
    const ratio = resolveVideoDisplayAspectRatio(
      "https://cdn.example.com/clip.mp4",
      "4-3",
      "4/3",
      resolveMediaAspectRatioNumeric,
    );
    assert.ok(Math.abs(ratio - 4 / 3) < 0.001);
  });
});

describe("mediaFitMode", () => {
  it("defaults unknown values to cover", () => {
    assert.equal(normalizeMediaFitMode(undefined), "cover");
    assert.equal(normalizeMediaFitMode("contain"), "contain");
  });
});
