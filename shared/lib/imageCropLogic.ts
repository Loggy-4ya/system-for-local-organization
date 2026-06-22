/**
 * @fileoverview Pure helpers for image crop geometry and export metadata.
 *
 * Browser canvas export lives in `src/lib/imageCropCanvas.ts`.
 *
 * Tests: `tests/shared/lib/imageCropLogic.test.ts` — `npm run test:image-crop`
 *
 * @module shared/lib/imageCropLogic
 */

import type { MediaPurpose } from "../constants/mediaStorage";
import {
  defaultCropAspectForPurpose,
  defaultCropAspectModeForPurpose,
  IMAGE_CROP_CONTEXTS,
  resolveImageCropContextsForPurpose,
  type CropAspectMode,
  type ImageCropContext,
} from "../constants/imageCropContexts";

/** Pixel crop rectangle relative to the natural (rotated) image. */
export interface ImageCropAreaPixels {
  /** Left edge in pixels. */
  x: number;
  /** Top edge in pixels. */
  y: number;
  /** Crop width in pixels. */
  width: number;
  /** Crop height in pixels. */
  height: number;
}

/** Output options when baking a crop to a raster file. */
export interface ImageCropExportOptions {
  /** Clockwise rotation in degrees applied before crop. */
  rotation?: number;
  /** JPEG/WebP quality 0–1. */
  quality?: number;
  /** Maximum longest edge of the exported bitmap. */
  maxDimension?: number;
}

/**
 * Convert degrees to radians.
 *
 * @param degreeValue - Clockwise rotation in degrees.
 * @returns Radians.
 */
export function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Bounding box size after rotating a rectangle.
 *
 * @param width - Unrotated width in pixels.
 * @param height - Unrotated height in pixels.
 * @param rotation - Clockwise rotation in degrees.
 * @returns Rotated bounding width and height.
 */
export function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Pick an output MIME type that preserves alpha when needed.
 *
 * @param sourceMime - Original file MIME type.
 * @returns `image/png` for PNG inputs, otherwise `image/jpeg`.
 */
export function resolveCropOutputMimeType(sourceMime: string): string {
  if (sourceMime === "image/png" || sourceMime === "image/webp") {
    return sourceMime;
  }
  return "image/jpeg";
}

/**
 * Build a filename for a cropped export.
 *
 * @param originalName - Source file name from the file picker.
 * @param mimeType - Output MIME type.
 * @returns Sanitized cropped file name.
 */
export function buildCroppedFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  const ext =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${base}-cropped.${ext}`;
}

/**
 * Scale crop export dimensions down when exceeding a max edge.
 *
 * @param width - Crop width in pixels.
 * @param height - Crop height in pixels.
 * @param maxDimension - Longest allowed edge.
 * @returns Scaled width and height (unchanged when already within limit).
 */
export function scaleCropDimensionsToMax(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Resolve preview contexts and default aspect for a crop session.
 *
 * @param purpose - Upload purpose driving mask selection.
 * @returns Context list and suggested aspect lock.
 */
export function resolveImageCropSession(purpose: MediaPurpose): {
  contexts: ImageCropContext[];
  defaultAspect: number | undefined;
  defaultAspectMode: CropAspectMode;
} {
  return {
    contexts: resolveImageCropContextsForPurpose(purpose),
    defaultAspect: defaultCropAspectForPurpose(purpose),
    defaultAspectMode: defaultCropAspectModeForPurpose(purpose),
  };
}

/**
 * Resolve numeric aspect ratio from the active crop mode.
 *
 * @param mode - Free-form or preset mask id.
 * @returns Width÷height, or `undefined` for free crop.
 */
export function resolveAspectRatioFromMode(mode: CropAspectMode): number | undefined {
  if (mode === "free") {
    return undefined;
  }
  return IMAGE_CROP_CONTEXTS[mode]?.aspectRatio;
}

/**
 * Compute on-screen crop frame size from container dimensions and frame scale.
 *
 * @param containerWidth - Viewport width in pixels.
 * @param containerHeight - Viewport height in pixels.
 * @param frameScale - 0–1 scale of the crop frame relative to the container.
 * @param aspect - Optional locked aspect ratio (width÷height).
 * @param round - When true, crop frame is square (circle masks).
 * @returns Crop frame width and height in pixels.
 */
export function computeCropFrameSize(
  containerWidth: number,
  containerHeight: number,
  frameScale: number,
  aspect: number | undefined,
  round: boolean,
): { width: number; height: number } {
  const clampedScale = Math.min(1, Math.max(0.35, frameScale));
  const maxWidth = containerWidth * clampedScale;
  const maxHeight = containerHeight * clampedScale;

  if (!aspect || round) {
    const size = Math.min(maxWidth, maxHeight);
    return { width: size, height: size };
  }

  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return { width, height };
}

export {
  resolveImageCropContextsForPurpose,
  defaultCropAspectForPurpose,
  defaultCropAspectModeForPurpose,
};
