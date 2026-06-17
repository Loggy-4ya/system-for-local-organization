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
 * Tests: `npm run test:media-storage`
 * Registry: `.ai/docs/testing.md`
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";
import {
  assertMediaUploadAllowed,
  MediaStorageValidationError,
} from "@shared/lib/mediaStorage/mediaStorageRules";
import { resolveMediaStorageProvider } from "@shared/lib/mediaStorage/resolveMediaStorageProvider";
import type { MediaStorageUploadResult } from "@shared/lib/mediaStorage/types";

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
   * Map validation errors to HTTP-friendly status codes.
   *
   * @param error - Caught upload error.
   * @returns Suggested HTTP status (400 for validation, 500 otherwise).
   */
  public static httpStatusForError(error: unknown): number {
    return error instanceof MediaStorageValidationError ? 400 : 500;
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
    if (error instanceof Error) {
      return error.message;
    }
    return "Media upload failed.";
  }
}

export { MediaStorageValidationError };
