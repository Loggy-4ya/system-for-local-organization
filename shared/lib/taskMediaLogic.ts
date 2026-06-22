/**
 * @fileoverview Pure helpers for task explanation and report media refs.
 *
 * @module shared/lib/taskMediaLogic
 */

import type { ITaskMediaRef } from "@shared/models/Task";

/**
 * Infer media kind from a MIME type or URL path.
 *
 * @param mimeType - Browser or server MIME type.
 * @param url - Public upload URL fallback.
 * @returns `"image"` or `"video"`.
 */
export function inferTaskMediaKind(mimeType: string | undefined, url: string): "image" | "video" {
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("image/")) return "image";

  const lower = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) return "video";
  return "image";
}

/**
 * Build a task media ref from an uploaded file URL.
 *
 * @param url - Public `/uploads/...` path from the upload API.
 * @param file - Original browser file (for MIME/kind inference).
 * @returns Task media ref suitable for create/report payloads.
 */
export function buildTaskMediaRefFromUpload(url: string, file: File): ITaskMediaRef {
  return {
    url,
    mimeType: file.type || undefined,
    kind: inferTaskMediaKind(file.type, url),
  };
}
