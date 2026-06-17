/**
 * @fileoverview App-wide client helper for authenticated media uploads.
 *
 * POSTs multipart form data to `/api/upload` with an optional purpose category.
 * Used by Puck fields, profile avatar picker, and future task-report UIs.
 *
 * @module src/lib/mediaUploadClient
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";

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
