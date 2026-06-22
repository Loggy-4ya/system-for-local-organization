/**
 * @fileoverview Display-context definitions for the app-wide image crop editor.
 *
 * Each context mirrors a real Nexus surface (profile hero, directory row, page cover,
 * Puck block aspect ratios) so users can preview masks before upload.
 *
 * @module shared/constants/imageCropContexts
 */

import type { MediaPurpose } from "./mediaStorage";

/** Unique id for a crop preview mask. */
export type ImageCropContextId =
  | "avatar-profile-hero"
  | "avatar-directory"
  | "avatar-badge"
  | "cover-wide-16-9"
  | "cover-ultrawide-21-9"
  | "block-16-9"
  | "block-1-1"
  | "block-9-16";

/** Crop aspect lock — preset mask ratio or free-form (iPhone-style custom crop). */
export type CropAspectMode = ImageCropContextId | "free";

/** Mask frame geometry and fit behaviour. */
export interface ImageCropContext {
  /** Stable identifier. */
  id: ImageCropContextId;
  /** Short label under the preview thumbnail. */
  label: string;
  /** Width divided by height for the crop viewport lock. */
  aspectRatio: number;
  /** Clip shape applied to the preview mask. */
  shape: "circle" | "rounded" | "rect";
  /** How media fills the mask (`cover` matches most Nexus surfaces). */
  fit: "cover" | "contain";
  /** Thumbnail width in the preview strip (px). */
  previewWidth: number;
  /** Thumbnail height in the preview strip (px). */
  previewHeight: number;
}

/** All registered preview contexts in stable order. */
export const IMAGE_CROP_CONTEXTS: Record<ImageCropContextId, ImageCropContext> = {
  "avatar-profile-hero": {
    id: "avatar-profile-hero",
    label: "Profile",
    aspectRatio: 1,
    shape: "circle",
    fit: "cover",
    previewWidth: 72,
    previewHeight: 72,
  },
  "avatar-directory": {
    id: "avatar-directory",
    label: "Directory",
    aspectRatio: 1,
    shape: "circle",
    fit: "cover",
    previewWidth: 40,
    previewHeight: 40,
  },
  "avatar-badge": {
    id: "avatar-badge",
    label: "Badge",
    aspectRatio: 1,
    shape: "circle",
    fit: "cover",
    previewWidth: 56,
    previewHeight: 56,
  },
  "cover-wide-16-9": {
    id: "cover-wide-16-9",
    label: "Cover 16:9",
    aspectRatio: 16 / 9,
    shape: "rect",
    fit: "cover",
    previewWidth: 120,
    previewHeight: 68,
  },
  "cover-ultrawide-21-9": {
    id: "cover-ultrawide-21-9",
    label: "Cover 21:9",
    aspectRatio: 21 / 9,
    shape: "rect",
    fit: "cover",
    previewWidth: 120,
    previewHeight: 51,
  },
  "block-16-9": {
    id: "block-16-9",
    label: "Block 16:9",
    aspectRatio: 16 / 9,
    shape: "rounded",
    fit: "cover",
    previewWidth: 96,
    previewHeight: 54,
  },
  "block-1-1": {
    id: "block-1-1",
    label: "Block 1:1",
    aspectRatio: 1,
    shape: "rounded",
    fit: "cover",
    previewWidth: 64,
    previewHeight: 64,
  },
  "block-9-16": {
    id: "block-9-16",
    label: "Block 9:16",
    aspectRatio: 9 / 16,
    shape: "rounded",
    fit: "cover",
    previewWidth: 54,
    previewHeight: 96,
  },
};

/** Default preview contexts per upload purpose. */
const PURPOSE_CONTEXT_IDS: Record<MediaPurpose, readonly ImageCropContextId[]> = {
  avatar: ["avatar-profile-hero", "avatar-directory", "avatar-badge"],
  "page-cover": ["cover-wide-16-9", "cover-ultrawide-21-9", "block-16-9"],
  "puck-block": ["block-16-9", "block-1-1", "block-9-16"],
  "task-report": ["block-16-9", "block-1-1"],
  general: ["avatar-profile-hero", "cover-wide-16-9", "block-16-9", "block-1-1"],
};

/**
 * Resolve preview mask contexts for an upload purpose.
 *
 * @param purpose - Media upload category from {@link MediaPurpose}.
 * @returns Ordered list of context definitions for the crop dialog preview strip.
 */
export function resolveImageCropContextsForPurpose(purpose: MediaPurpose): ImageCropContext[] {
  return PURPOSE_CONTEXT_IDS[purpose].map((id) => IMAGE_CROP_CONTEXTS[id]);
}

/**
 * Default aspect ratio lock for the crop viewport (first context for the purpose).
 *
 * @param purpose - Upload purpose key.
 * @returns Numeric aspect ratio or `undefined` for free-form crop.
 */
export function defaultCropAspectForPurpose(purpose: MediaPurpose): number | undefined {
  const contexts = resolveImageCropContextsForPurpose(purpose);
  return contexts[0]?.aspectRatio;
}

/**
 * Default aspect mode when opening the crop dialog.
 *
 * Avatars start locked to the profile circle; other purposes start in free-form crop.
 *
 * @param purpose - Upload purpose key.
 * @returns Initial {@link CropAspectMode}.
 */
export function defaultCropAspectModeForPurpose(purpose: MediaPurpose): CropAspectMode {
  if (purpose === "avatar") {
    return "avatar-profile-hero";
  }
  return "free";
}
