/**
 * @fileoverview Pure validation and filename helpers for media uploads.
 *
 * @module shared/lib/mediaStorage/mediaStorageRules
 *
 * Tests: `npm run test:media-storage`
 * Registry: `.ai/docs/testing.md`
 */

import {
  DEFAULT_MEDIA_PURPOSE,
  MEDIA_PURPOSE_POLICIES,
  MEDIA_PURPOSES,
  type MediaKind,
  type MediaPurpose,
} from "@shared/constants/mediaStorage";

/** Thrown when an upload fails validation before reaching a storage provider. */
export class MediaStorageValidationError extends Error {
  /**
   * @param message - User-facing validation message.
   */
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageValidationError";
  }
}

/** Fallback extensions when the original filename has no extension. */
const FALLBACK_EXTENSION: Record<MediaKind, string> = {
  image: ".png",
  video: ".mp4",
};

/** Common MIME → extension map for safe filename generation. */
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/ogg": ".ogg",
};

/**
 * Resolve MIME kind from a declared content type.
 *
 * @param mimeType - Declared MIME type (e.g. `image/png`).
 * @returns `image`, `video`, or `null` when unsupported.
 */
export function resolveMediaKind(mimeType: string): MediaKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

/**
 * Parse and normalise an upload purpose string from form data.
 *
 * @param raw - Raw purpose field from multipart form or JSON.
 * @returns Valid {@link MediaPurpose}, or default when missing/unknown.
 */
export function parseMediaPurpose(raw: unknown): MediaPurpose {
  if (typeof raw !== "string" || !raw.trim()) {
    return DEFAULT_MEDIA_PURPOSE;
  }
  const normalized = raw.trim() as MediaPurpose;
  return (MEDIA_PURPOSES as readonly string[]).includes(normalized)
    ? normalized
    : DEFAULT_MEDIA_PURPOSE;
}

/**
 * Validate upload bytes against purpose policy (MIME, size, buffer length).
 *
 * @param params - Upload metadata before provider persistence.
 * @throws {@link MediaStorageValidationError} When validation fails.
 */
export function assertMediaUploadAllowed(params: {
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
  bufferLength: number;
}): MediaKind {
  const { purpose, mimeType, sizeBytes, bufferLength } = params;
  const policy = MEDIA_PURPOSE_POLICIES[purpose];
  const kind = resolveMediaKind(mimeType);

  if (!kind) {
    throw new MediaStorageValidationError("Only image and video files are allowed.");
  }

  if (!policy.allowedKinds.includes(kind)) {
    const allowed = policy.allowedKinds.join(" and ");
    throw new MediaStorageValidationError(
      `${policy.label} accepts ${allowed} files only.`,
    );
  }

  const maxBytes = kind === "video" ? policy.maxVideoBytes : policy.maxImageBytes;
  if (sizeBytes > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new MediaStorageValidationError(
      `File size exceeds the ${limitMb}MB limit for ${policy.label.toLowerCase()}.`,
    );
  }

  if (bufferLength !== sizeBytes) {
    throw new MediaStorageValidationError("Upload payload size mismatch.");
  }

  return kind;
}

/**
 * Build a unique, URL-safe filename for storage.
 *
 * @param originalName - Client-provided filename.
 * @param mimeType - Declared MIME type.
 * @param kind - Resolved media kind.
 * @returns Sanitized filename with extension.
 */
export function buildStoredFilename(
  originalName: string,
  mimeType: string,
  kind: MediaKind,
): string {
  const fromName = extractExtension(originalName);
  const fromMime = MIME_EXTENSION_MAP[mimeType.toLowerCase()];
  const extension = fromName || fromMime || FALLBACK_EXTENSION[kind];

  const baseName = originalName
    .replace(fromName ?? extension, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const safeBase = baseName || "media";
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  return `${safeBase}-${uniqueSuffix}${extension}`;
}

/**
 * Extract a lowercase file extension including the dot.
 *
 * @param filename - Original filename.
 * @returns Extension or empty string.
 */
function extractExtension(filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  if (!ext || ext.length > 8) return "";
  return ext.toLowerCase();
}

/**
 * Compose a public URL path for locally stored uploads.
 *
 * @param storageSegment - Purpose segment (e.g. `avatars`).
 * @param filename - Stored filename.
 * @returns Root-relative URL (e.g. `/uploads/avatars/foo.png`).
 */
export function buildLocalPublicUrl(storageSegment: string, filename: string): string {
  return `/uploads/${storageSegment}/${filename}`;
}

/**
 * Compose the provider storage key for local filesystem layout.
 *
 * @param storageSegment - Purpose segment.
 * @param filename - Stored filename.
 * @returns Relative key under the uploads root.
 */
export function buildLocalStorageKey(storageSegment: string, filename: string): string {
  return `${storageSegment}/${filename}`;
}
