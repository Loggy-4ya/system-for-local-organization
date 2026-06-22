/**
 * @fileoverview Imperative bridge between upload callers and {@link NexusImageCropHost}.
 *
 * @module src/components/media/imageCropHostState
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";
import type { ImageCropContextId } from "@shared/constants/imageCropContexts";

/** Options passed when opening the crop dialog. */
export interface ImageCropDialogOptions {
  /** Upload purpose — drives default masks and aspect lock. */
  purpose?: MediaPurpose;
  /** Optional title override. */
  title?: string;
  /** Lock crop aspect to a specific preview context. */
  initialContextId?: ImageCropContextId;
}

/** Internal request handed to the mounted host component. */
export interface ImageCropHostRequest {
  /** Original picked file. */
  file: File;
  /** Object URL for the cropper (`URL.createObjectURL`). */
  imageUrl: string;
  /** Caller options. */
  options: ImageCropDialogOptions;
  /** Promise resolver — `null` when cancelled. */
  resolve: (file: File | null) => void;
}

type HostSetter = (request: ImageCropHostRequest | null) => void;

let hostSetter: HostSetter | null = null;

/**
 * Register the mounted crop host (called once from {@link NexusImageCropHost}).
 *
 * @param setter - State setter for the active crop request.
 */
export function registerImageCropHost(setter: HostSetter): void {
  hostSetter = setter;
}

/**
 * Clear host registration on unmount.
 */
export function unregisterImageCropHost(): void {
  hostSetter = null;
}

/**
 * Open the app-wide crop dialog for a local image file.
 *
 * @param file - Image file from input or drag-and-drop.
 * @param options - Purpose and UI options.
 * @returns Cropped file, or `null` when the user cancels.
 */
export function openImageCropDialog(
  file: File,
  options: ImageCropDialogOptions = {},
): Promise<File | null> {
  if (!hostSetter) {
    return Promise.reject(
      new Error("Image crop host is not mounted. Add NexusImageCropHost to the root layout."),
    );
  }

  return new Promise((resolve) => {
    const imageUrl = URL.createObjectURL(file);
    hostSetter?.({
      file,
      imageUrl,
      options,
      resolve,
    });
  });
}

/**
 * Close the active request and revoke its object URL.
 *
 * @param request - Active host request.
 * @param result - Cropped file or cancel.
 */
export function completeImageCropRequest(
  request: ImageCropHostRequest,
  result: File | null,
): void {
  URL.revokeObjectURL(request.imageUrl);
  request.resolve(result);
  hostSetter?.(null);
}
