/**
 * @fileoverview Unit tests for image crop geometry helpers.
 *
 * Run: `npm run test:image-crop`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/imageCropLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCroppedFileName,
  computeCropFrameSize,
  getRadianAngle,
  resolveCropOutputMimeType,
  resolveImageCropSession,
  rotateSize,
  scaleCropDimensionsToMax,
} from "@shared/lib/imageCropLogic";
import { resolveImageCropContextsForPurpose } from "@shared/constants/imageCropContexts";

describe("imageCropLogic", () => {
  it("convert degrees to radians", () => {
    assert.equal(getRadianAngle(180), Math.PI);
    assert.equal(getRadianAngle(90), Math.PI / 2);
  });

  it("compute rotated bounding box size", () => {
    const square = rotateSize(100, 100, 0);
    assert.equal(square.width, 100);
    assert.equal(square.height, 100);

    const rotated = rotateSize(100, 50, 90);
    assert.ok(Math.abs(rotated.width - 50) < 0.001);
    assert.ok(Math.abs(rotated.height - 100) < 0.001);
  });

  it("scale crop dimensions to max edge", () => {
    const scaled = scaleCropDimensionsToMax(4000, 2000, 2048);
    assert.equal(scaled.width, 2048);
    assert.equal(scaled.height, 1024);

    const unchanged = scaleCropDimensionsToMax(800, 600, 2048);
    assert.deepEqual(unchanged, { width: 800, height: 600 });
  });

  it("pick output mime type", () => {
    assert.equal(resolveCropOutputMimeType("image/png"), "image/png");
    assert.equal(resolveCropOutputMimeType("image/jpeg"), "image/jpeg");
    assert.equal(resolveCropOutputMimeType("image/heic"), "image/jpeg");
  });

  it("build cropped file names", () => {
    assert.equal(buildCroppedFileName("photo.jpg", "image/jpeg"), "photo-cropped.jpg");
    assert.equal(buildCroppedFileName("avatar.png", "image/png"), "avatar-cropped.png");
  });

  it("resolve avatar preview contexts", () => {
    const contexts = resolveImageCropContextsForPurpose("avatar");
    assert.equal(contexts.length, 3);
    assert.ok(contexts.every((context) => context.aspectRatio === 1));
    assert.ok(contexts.every((context) => context.shape === "circle"));
  });

  it("resolve crop session defaults", () => {
    const session = resolveImageCropSession("page-cover");
    assert.equal(session.contexts.length, 3);
    assert.equal(session.defaultAspect, session.contexts[0]?.aspectRatio);
    assert.equal(session.defaultAspectMode, "free");
  });

  it("avatar session starts on profile mask", () => {
    const session = resolveImageCropSession("avatar");
    assert.equal(session.defaultAspectMode, "avatar-profile-hero");
  });

  it("compute crop frame size with aspect and scale", () => {
    const frame = computeCropFrameSize(400, 300, 0.9, 16 / 9, false);
    assert.ok(frame.width <= 360);
    assert.ok(frame.height <= 270);
    assert.ok(Math.abs(frame.width / frame.height - 16 / 9) < 0.01);
  });

  it("compute free crop frame respects scale", () => {
    const small = computeCropFrameSize(400, 300, 0.5, undefined, false);
    const large = computeCropFrameSize(400, 300, 1, undefined, false);
    assert.ok(small.width < large.width);
    assert.ok(small.height < large.height);
  });
});
