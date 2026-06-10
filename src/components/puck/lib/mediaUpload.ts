/**
 * @fileoverview Shared media upload helper for Puck custom fields.
 *
 * POSTs multipart form data to `/api/upload` and returns the public URL.
 *
 * @module src/components/puck/lib/mediaUpload
 */

/** Accepted MIME prefixes for media uploads. */
export type MediaAccept = "image" | "video" | "both";

/**
 * Upload a file to the Nexus media endpoint.
 *
 * @param file - Browser File object selected or dropped by the user.
 * @param accept - Restrict client-side validation to image, video, or both.
 * @returns Public URL path (e.g. `/uploads/foo.png`).
 * @throws When the server rejects the upload or returns no URL.
 */
export async function uploadMediaFile(
  file: File,
  accept: MediaAccept = "both",
): Promise<string> {
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

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = "Upload failed.";
    try {
      const parsed = JSON.parse(errText);
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
