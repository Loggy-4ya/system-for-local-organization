/**
 * @fileoverview Consolidated Media domain engine for Project Nexus.
 *
 * Single entry point for validating and persisting user-generated images and
 * videos (avatars, page covers, Puck block media, future task reports).
 * Storage backend is selected via `MEDIA_STORAGE_DRIVER` — local filesystem
 * today, Google Cloud Storage when deployed.
 *
 * @module shared/domains/MediaDomain
 *
 * Tests: `npm run test:media-storage`, `npm run test:remote-image-import`, `npm run test:orphan-upload-cleanup`
 * Registry: `.ai/docs/testing.md`
 */

import {
  MEDIA_PURPOSE_POLICIES,
  type MediaPurpose,
} from "@shared/constants/mediaStorage";
import Page from "@shared/models/Page";
import User from "@shared/models/User";
import {
  assertMediaUploadAllowed,
  MediaStorageValidationError,
} from "@shared/lib/mediaStorage/mediaStorageRules";
import { listLocalUploadInventory } from "@shared/lib/mediaStorage/localUploadInventory";
import {
  findOrphanStorageKeys,
  readOrphanMinAgeMs,
  type OrphanUploadCleanupSummary,
} from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";
import {
  deriveRemoteImageOriginalName,
  fetchRemoteImage,
  MediaRemoteImportError,
  sniffRemoteImageMime,
} from "@shared/lib/mediaStorage/remoteImageImport";
import {
  readMediaStorageEnvConfig,
  resolveMediaStorageProvider,
} from "@shared/lib/mediaStorage/resolveMediaStorageProvider";
import type { MediaStorageUploadResult } from "@shared/lib/mediaStorage/types";
import { listUploadInventory } from "@shared/lib/mediaStorage/uploadInventory";
import {
  collectUploadStorageKeysFromValue,
  mediaReferenceContextFromConfig,
} from "@shared/lib/mediaStorage/uploadReferenceUtils";

/** Input accepted by {@link MediaDomain.upload}. */
export interface MediaUploadRequest {
  /** Raw file bytes. */
  buffer: Buffer;
  /** Original filename from the client. */
  originalName: string;
  /** Declared MIME type. */
  mimeType: string;
  /** Upload category. */
  purpose: MediaPurpose;
  /** Optional owner namespace (user id, page path, task id). */
  ownerKey?: string;
}

/** Input accepted by {@link MediaDomain.uploadFromUrl}. */
export interface MediaImportFromUrlRequest {
  /** Public HTTPS URL of a raster image to download and store locally. */
  url: string;
  /** Upload category — must allow images (avatar, page-cover, puck-block, etc.). */
  purpose: MediaPurpose;
  /** Optional owner namespace (user id, page path, task id). */
  ownerKey?: string;
}

/** Options for {@link MediaDomain.cleanupOrphanUploads}. */
export interface OrphanUploadCleanupOptions {
  /** When true, report orphans without deleting files. */
  dryRun?: boolean;
  /** Override minimum file age before deletion (milliseconds). */
  minAgeMs?: number;
  /** Project root for local inventory (defaults to `process.cwd()`). */
  projectRoot?: string;
}

/** Thrown when orphan cleanup is invoked on an unsupported storage driver. */
export class MediaOrphanCleanupError extends Error {
  /**
   * @param message - User-facing error message.
   */
  constructor(message: string) {
    super(message);
    this.name = "MediaOrphanCleanupError";
  }
}

/**
 * Media Domain Engine.
 *
 * Validates uploads against purpose-specific policies and delegates persistence
 * to the configured storage provider.
 */
export class MediaDomain {
  /**
   * Validate and store an uploaded media file.
   *
   * @param request - Upload request from an API route or worker.
   * @returns Public URL and storage metadata.
   * @throws {@link MediaStorageValidationError} When MIME, size, or purpose rules fail.
   * @throws Error When the storage provider fails.
   */
  public static async upload(request: MediaUploadRequest): Promise<MediaStorageUploadResult> {
    const sizeBytes = request.buffer.length;
    assertMediaUploadAllowed({
      purpose: request.purpose,
      mimeType: request.mimeType,
      sizeBytes,
      bufferLength: request.buffer.length,
    });

    const provider = resolveMediaStorageProvider();

    return provider.upload({
      buffer: request.buffer,
      originalName: request.originalName,
      mimeType: request.mimeType,
      sizeBytes,
      purpose: request.purpose,
      ownerKey: request.ownerKey,
    });
  }

  /**
   * Download a remote HTTPS image and persist it through the normal upload pipeline.
   *
   * Applies SSRF guards, redirect validation, size limits, and magic-byte MIME sniffing.
   * SVG and markup responses are rejected.
   *
   * @param request - Remote URL import request.
   * @returns Public URL and storage metadata (same shape as {@link MediaDomain.upload}).
   * @throws {@link MediaRemoteImportError} When the URL or download is unsafe/invalid.
   * @throws {@link MediaStorageValidationError} When purpose/MIME/size rules fail after download.
   */
  public static async uploadFromUrl(
    request: MediaImportFromUrlRequest,
  ): Promise<MediaStorageUploadResult> {
    const policy = MEDIA_PURPOSE_POLICIES[request.purpose];
    if (!policy.allowedKinds.includes("image")) {
      throw new MediaStorageValidationError(
        `${policy.label} does not accept remote image import.`,
      );
    }

    const { buffer, finalUrl } = await fetchRemoteImage(request.url, policy.maxImageBytes);
    const mimeType = sniffRemoteImageMime(buffer);
    if (!mimeType) {
      throw new MediaRemoteImportError(
        "Downloaded file is not a supported image (PNG, JPEG, GIF, or WebP).",
      );
    }

    const originalName = deriveRemoteImageOriginalName(finalUrl, mimeType);

    return MediaDomain.upload({
      buffer,
      originalName,
      mimeType,
      purpose: request.purpose,
      ownerKey: request.ownerKey,
    });
  }

  /**
   * Collect every local upload storage key referenced in MongoDB documents.
   *
   * Scans user avatars and all Puck page layout JSON.
   *
   * @returns Deduped storage keys still in use.
   */
  public static async collectReferencedUploadKeysFromDatabase(): Promise<Set<string>> {
    const config = readMediaStorageEnvConfig();
    const referenceContext = mediaReferenceContextFromConfig(config);
    const referenced = new Set<string>();

    const users = await User.find({}, { avatar: 1 }).lean();
    for (const user of users) {
      collectUploadStorageKeysFromValue(user.avatar, referenced, referenceContext);
    }

    const pages = await Page.find({}, { puckData: 1 }).lean();
    for (const page of pages) {
      collectUploadStorageKeysFromValue(page.puckData, referenced, referenceContext);
    }

    return referenced;
  }

  /**
   * Scan stored uploads against MongoDB references and delete orphan objects.
   *
   * Works for `MEDIA_STORAGE_DRIVER=local` (filesystem), `gcs`, and `s3` (bucket listing).
   * Files newer than `MEDIA_ORPHAN_MIN_AGE_HOURS` (default 24) are retained even when unreferenced.
   *
   * @param options - Dry-run flag and optional age override.
   * @returns Cleanup summary counts and deleted keys.
   * @throws {@link MediaOrphanCleanupError} When the active provider lacks delete/list support.
   */
  public static async cleanupOrphanUploads(
    options: OrphanUploadCleanupOptions = {},
  ): Promise<OrphanUploadCleanupSummary> {
    const config = readMediaStorageEnvConfig();
    const dryRun = options.dryRun ?? false;
    const minAgeMs = options.minAgeMs ?? readOrphanMinAgeMs();

    const referencedKeys = await MediaDomain.collectReferencedUploadKeysFromDatabase();
    const onDisk = await listUploadInventory(config);
    const { orphans, skippedRecentCount } = findOrphanStorageKeys(
      referencedKeys,
      onDisk,
      minAgeMs,
    );

    const provider = resolveMediaStorageProvider(config);
    if (!provider.delete) {
      throw new MediaOrphanCleanupError("Active media provider does not support delete.");
    }

    const deletedKeys: string[] = [];
    const errors: string[] = [];

    if (!dryRun) {
      for (const storageKey of orphans) {
        try {
          await provider.delete(storageKey);
          deletedKeys.push(storageKey);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Delete failed.";
          errors.push(`${storageKey}: ${message}`);
        }
      }
    }

    return {
      dryRun,
      referencedCount: referencedKeys.size,
      onDiskCount: onDisk.length,
      orphanCount: orphans.length,
      skippedRecentCount,
      deletedKeys,
      errors,
    };
  }

  /**
   * Map validation errors to HTTP-friendly status codes.
   *
   * @param error - Caught upload error.
   * @returns Suggested HTTP status (400 for validation, 500 otherwise).
   */
  public static httpStatusForError(error: unknown): number {
    if (error instanceof MediaStorageValidationError) return 400;
    if (error instanceof MediaRemoteImportError) return 400;
    if (error instanceof MediaOrphanCleanupError) return 400;
    return 500;
  }

  /**
   * Extract a user-facing message from an upload error.
   *
   * @param error - Caught upload error.
   * @returns Safe error string for API responses.
   */
  public static messageForError(error: unknown): string {
    if (error instanceof MediaStorageValidationError) {
      return error.message;
    }
    if (error instanceof MediaRemoteImportError) {
      return error.message;
    }
    if (error instanceof MediaOrphanCleanupError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Media upload failed.";
  }
}

export { MediaRemoteImportError, MediaStorageValidationError };
export type { OrphanUploadCleanupSummary };
