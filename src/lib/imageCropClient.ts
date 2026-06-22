/**
 * @fileoverview Client helpers for opening the crop dialog before media upload.
 *
 * @module src/lib/imageCropClient
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";
import type { ImageCropContextId } from "@shared/constants/imageCropContexts";
import { openImageCropDialog } from "@/components/media/imageCropHostState";

/** Options for {@link cropImageFile}. */
export interface CropImageFileOptions {
  /** Upload purpose — selects preview masks and default aspect. */
  purpose?: MediaPurpose;
  /** Dialog title override. */
  title?: string;
  /** Initial preview mask / aspect lock. */
  initialContextId?: ImageCropContextId;
}

/**
 * Returns true when the file should pass through the crop editor.
 *
 * GIF animations and non-images skip cropping.
 *
 * @param file - Browser file from input or drop.
 * @returns Whether to open the crop dialog.
 */
export function shouldOpenImageCropForFile(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  if (file.type === "image/gif") return false;
  return true;
}

/**
 * Open the crop dialog and return the cropped file (or null when cancelled).
 *
 * @param file - Original image file.
 * @param options - Purpose and UI options.
 * @returns Cropped file or cancel sentinel.
 */
export async function cropImageFile(
  file: File,
  options: CropImageFileOptions = {},
): Promise<File | null> {
  if (!shouldOpenImageCropForFile(file)) {
    return file;
  }

  return openImageCropDialog(file, {
    purpose: options.purpose,
    title: options.title,
    initialContextId: options.initialContextId,
  });
}

export { openImageCropDialog };
