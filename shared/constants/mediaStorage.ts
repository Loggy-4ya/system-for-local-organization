/**
 * @fileoverview Media storage purpose definitions, size limits, and driver configuration.
 *
 * Single source of truth for upload categories across avatars, page covers,
 * Puck block media, and future task-report videos.
 *
 * @module shared/constants/mediaStorage
 */

/** Supported storage backends — swap via `MEDIA_STORAGE_DRIVER`. */
export type MediaStorageDriver = "local" | "gcs";

/**
 * Upload category controlling validation rules and on-disk/cloud prefix.
 *
 * - `avatar` — profile photo (images only, small limit).
 * - `page-cover` — Puck page root hero / cover image.
 * - `puck-block` — inline images and videos inside Puck blocks.
 * - `task-report` — future task submission attachments (images + longer videos).
 * - `general` — fallback when no purpose is supplied.
 */
export type MediaPurpose =
  | "avatar"
  | "page-cover"
  | "puck-block"
  | "task-report"
  | "general";

/** Allowed MIME category for a media purpose. */
export type MediaKind = "image" | "video";

/** Validation profile for a {@link MediaPurpose}. */
export interface MediaPurposePolicy {
  /** Human-readable label for error messages. */
  label: string;
  /** Subfolder / object prefix segment (no leading or trailing slashes). */
  storageSegment: string;
  /** Permitted MIME kinds for this purpose. */
  allowedKinds: readonly MediaKind[];
  /** Maximum image payload size in bytes. */
  maxImageBytes: number;
  /** Maximum video payload size in bytes (ignored when videos are disallowed). */
  maxVideoBytes: number;
}

/** Default local filesystem root relative to project cwd (`public/uploads`). */
export const LOCAL_UPLOADS_ROOT_SEGMENT = "public/uploads";

/** All supported upload purposes in stable order. */
export const MEDIA_PURPOSES = [
  "avatar",
  "page-cover",
  "puck-block",
  "task-report",
  "general",
] as const satisfies readonly MediaPurpose[];

/** Per-purpose validation and storage layout policy. */
export const MEDIA_PURPOSE_POLICIES: Record<MediaPurpose, MediaPurposePolicy> = {
  avatar: {
    label: "Profile avatar",
    storageSegment: "avatars",
    allowedKinds: ["image"],
    maxImageBytes: 2 * 1024 * 1024,
    maxVideoBytes: 0,
  },
  "page-cover": {
    label: "Page cover",
    storageSegment: "page-covers",
    allowedKinds: ["image"],
    maxImageBytes: 5 * 1024 * 1024,
    maxVideoBytes: 0,
  },
  "puck-block": {
    label: "Page block media",
    storageSegment: "puck-blocks",
    allowedKinds: ["image", "video"],
    maxImageBytes: 5 * 1024 * 1024,
    maxVideoBytes: 50 * 1024 * 1024,
  },
  "task-report": {
    label: "Task report attachment",
    storageSegment: "task-reports",
    allowedKinds: ["image", "video"],
    maxImageBytes: 5 * 1024 * 1024,
    maxVideoBytes: 100 * 1024 * 1024,
  },
  general: {
    label: "Media upload",
    storageSegment: "general",
    allowedKinds: ["image", "video"],
    maxImageBytes: 5 * 1024 * 1024,
    maxVideoBytes: 50 * 1024 * 1024,
  },
};

/** Default purpose when clients omit the field (Puck editor compatibility). */
export const DEFAULT_MEDIA_PURPOSE: MediaPurpose = "puck-block";

/** Default storage driver when `MEDIA_STORAGE_DRIVER` is unset. */
export const DEFAULT_MEDIA_STORAGE_DRIVER: MediaStorageDriver = "local";
