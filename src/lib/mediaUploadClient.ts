/**
 * @fileoverview App-wide client helper for authenticated media uploads.
 *
 * POSTs multipart form data to `/api/upload` with an optional purpose category.
 * Used by Puck fields, profile avatar picker, and future task-report UIs.
 *
 * @module src/lib/mediaUploadClient
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";
import { cropImageFile, shouldOpenImageCropForFile } from "@/lib/imageCropClient";

/** Accepted MIME prefixes for client-side pre-validation. */
export type MediaAccept = "image" | "video" | "both";

/** Options for {@link uploadMediaFile}. */
export interface UploadMediaFileOptions {
  /** Restrict client-side validation to image, video, or both. */
  accept?: MediaAccept;
  /** Upload category — controls server-side limits and storage folder. */
  purpose?: MediaPurpose;
  /** Optional namespace key forwarded to the API. */
  ownerKey?: string;
  /** When true, skip the app-wide crop dialog for image uploads. */
  skipCrop?: boolean;
}

/**
 * Upload a file to the Nexus media endpoint.
 *
 * @param file - Browser File object selected or dropped by the user.
 * @param options - Accept filter, purpose, and optional owner key.
 * @returns Public URL path (e.g. `/uploads/avatars/foo.png`).
 * @throws When the server rejects the upload or returns no URL.
 */
export async function uploadMediaFile(
  file: File,
  options: UploadMediaFileOptions = {},
): Promise<string> {
  const accept = options.accept ?? "both";

  if (accept === "image" && !file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (accept === "video" && !file.type.startsWith("video/")) {
    throw new Error("Only video files are allowed.");
  }
  if (accept === "both" && !file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Only image or video files are allowed.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (options.purpose) {
    formData.append("purpose", options.purpose);
  }
  if (options.ownerKey) {
    formData.append("ownerKey", options.ownerKey);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = "Upload failed.";
    try {
      const parsed = JSON.parse(errText) as { error?: string };
      errMsg = parsed.error || errMsg;
    } catch {
      errMsg = errText || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("No URL returned from server.");
  }

  return data.url;
}

/**
 * Open the crop dialog (when applicable) then upload via {@link uploadMediaFile}.
 *
 * @param file - Browser file from input or drag-and-drop.
 * @param options - Accept filter, purpose, owner key, and crop skip flag.
 * @returns Public URL path, or `null` when the user cancels the crop dialog.
 * @throws When the server rejects the upload or returns no URL.
 */
export async function uploadMediaFileWithCrop(
  file: File,
  options: UploadMediaFileOptions = {},
): Promise<string | null> {
  let payload = file;

  if (
    !options.skipCrop &&
    (options.accept === "image" || options.accept === undefined || options.accept === "both") &&
    file.type.startsWith("image/")
  ) {
    const cropped = await cropImageFile(file, { purpose: options.purpose });
    if (!cropped) {
      return null;
    }
    payload = cropped;
  }

  return uploadMediaFile(payload, options);
}

/**
 * Whether an uploaded media URL points at a raster image that supports the crop editor.
 *
 * Excludes videos, GIF animations, and empty values.
 *
 * @param value - Public media path or absolute URL.
 * @returns True when click-to-recrop may be offered.
 */
export function isRecroppableUploadedImageUrl(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || trimmed.includes("video")) return false;
  if (trimmed.match(/\.gif(\?|$)/i)) return false;
  return true;
}

/**
 * Load an existing image URL into a browser {@link File} for the crop dialog.
 *
 * @param url - Same-origin `/uploads/…` path or absolute image URL.
 * @returns File reconstructed from the fetched bytes.
 * @throws When the fetch fails or the response is not an image.
 */
async function fetchImageFileFromMediaUrl(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Could not load the image for cropping.");
  }

  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Only images can be recropped.");
  }

  let filename = "image.png";
  try {
    const parsed = new URL(url, window.location.origin);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    if (segment) {
      filename = segment;
    }
  } catch {
    // Keep default filename when URL parsing fails.
  }

  return new File([blob], filename, { type: blob.type });
}

/**
 * Re-open the crop editor for an already-uploaded image and persist a new upload.
 *
 * @param url - Current field value (local `/uploads/…` path or fetchable image URL).
 * @param options - Upload purpose and optional owner key.
 * @returns Replacement public URL, or `null` when the user cancels the crop dialog.
 * @throws When the image cannot be loaded or the server rejects the upload.
 */
export async function recropUploadedMediaImage(
  url: string,
  options: Omit<UploadMediaFileOptions, "accept" | "skipCrop"> = {},
): Promise<string | null> {
  if (!isRecroppableUploadedImageUrl(url)) {
    return null;
  }

  const file = await fetchImageFileFromMediaUrl(url);
  if (!shouldOpenImageCropForFile(file)) {
    return null;
  }

  const cropped = await cropImageFile(file, {
    purpose: options.purpose,
    title: "Edit photo",
  });
  if (!cropped) {
    return null;
  }

  return uploadMediaFile(cropped, { ...options, accept: "image" });
}

/**
 * Test whether a field value looks like a remote HTTP(S) URL worth importing.
 *
 * Local `/uploads/` paths and empty values are excluded.
 *
 * @param value - URL string from a media field.
 * @returns True when import-from-link may be offered.
 */
export function isImportableRemoteMediaUrl(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith("/uploads/")) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Download a remote image via `/api/upload/from-url` and return the local public path.
 *
 * @param url - HTTPS (or HTTP) image URL to import.
 * @param options - Purpose and optional owner key (images only).
 * @returns Local URL path (e.g. `/uploads/puck-blocks/foo.png`).
 * @throws When the server rejects the import or returns no URL.
 */
export async function importMediaImageFromUrl(
  url: string,
  options: Omit<UploadMediaFileOptions, "accept"> = {},
): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Image URL is required.");
  }

  const res = await fetch("/api/upload/from-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: trimmed,
      purpose: options.purpose,
      ownerKey: options.ownerKey,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = "Image import failed.";
    try {
      const parsed = JSON.parse(errText) as { error?: string };
      errMsg = parsed.error || errMsg;
    } catch {
      errMsg = errText || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("No URL returned from server.");
  }

  return data.url;
}
