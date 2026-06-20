/**
 * @fileoverview Shared types for the Nexus media storage provider abstraction.
 *
 * @module shared/lib/mediaStorage/types
 */

import type { MediaPurpose } from "@shared/constants/mediaStorage";

/** Payload accepted by {@link MediaStorageProvider.upload}. */
export interface MediaStorageUploadPayload {
  /** Raw file bytes. */
  buffer: Buffer;
  /** Original filename from the client (used for extension inference only). */
  originalName: string;
  /** Declared MIME type from the upload request. */
  mimeType: string;
  /** File size in bytes (must match buffer length). */
  sizeBytes: number;
  /** Upload category — controls validation and storage prefix. */
  purpose: MediaPurpose;
  /** Optional namespace key (user id, page slug, task id) for future lifecycle hooks. */
  ownerKey?: string;
}

/** Result returned after a successful provider upload. */
export interface MediaStorageUploadResult {
  /** Browser-resolvable public URL (path for local, absolute URL for cloud). */
  url: string;
  /** Provider-internal object key (relative path or GCS object name). */
  storageKey: string;
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Pluggable media storage backend.
 *
 * Implementations: {@link LocalFilesystemMediaProvider}, future GCS provider.
 */
export interface MediaStorageProvider {
  /**
   * Persist validated media and return its public URL.
   *
   * @param payload - Validated upload payload from {@link MediaDomain.upload}.
   * @returns Public URL and storage metadata.
   */
  upload(payload: MediaStorageUploadPayload): Promise<MediaStorageUploadResult>;

  /**
   * Remove a stored object by its provider key (optional — not all callers need delete yet).
   *
   * @param storageKey - Key returned from a prior upload.
   */
  delete?(storageKey: string): Promise<void>;

  /**
   * List stored objects for orphan cleanup scans (optional — local + GCS providers).
   *
   * @returns Files/objects with provider storage keys and last-modified timestamps.
   */
  listInventory?(): Promise<
    import("@shared/lib/mediaStorage/orphanUploadCleanupLogic").LocalUploadInventoryEntry[]
  >;
}

/** Environment configuration consumed by provider resolution. */
export interface MediaStorageEnvConfig {
  driver: import("@shared/constants/mediaStorage").MediaStorageDriver;
  /** Project root for local filesystem writes. */
  projectRoot: string;
  /** GCS bucket name — required when driver is `gcs`. */
  gcsBucket?: string;
  /** Optional CDN or bucket public base URL for GCS objects. */
  gcsPublicBaseUrl?: string;
}
