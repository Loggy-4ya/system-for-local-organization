/**
 * @fileoverview Google Cloud Storage media provider.
 *
 * Stores objects as `{segment}/{filename}` keys inside `GCS_MEDIA_BUCKET`.
 * Public URLs use `GCS_MEDIA_PUBLIC_BASE_URL` when set, otherwise the default
 * `storage.googleapis.com` object URL.
 *
 * @module shared/lib/mediaStorage/gcsMediaProvider
 *
 * Tests: `npm run test:upload-reference-utils` (URL/key helpers)
 * Registry: `.ai/docs/testing.md`
 */

import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";
import {
  buildGcsPublicUrl,
  normalizeStorageKey,
} from "@shared/lib/mediaStorage/gcsObjectKey";
import type { LocalUploadInventoryEntry } from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";
import {
  buildLocalStorageKey,
  buildStoredFilename,
  resolveMediaKind,
} from "@shared/lib/mediaStorage/mediaStorageRules";
import type {
  MediaStorageProvider,
  MediaStorageUploadPayload,
  MediaStorageUploadResult,
} from "@shared/lib/mediaStorage/types";

/** Minimal GCS file handle used for inventory, upload, and delete. */
interface GcsFileHandle {
  name?: string;
  metadata?: { updated?: string; timeCreated?: string };
  save(
    data: Buffer,
    options?: {
      contentType?: string;
      resumable?: boolean;
      metadata?: { cacheControl?: string };
    },
  ): Promise<void>;
  delete(): Promise<unknown>;
}

/** Minimal GCS bucket handle. */
interface GcsBucketHandle {
  file(name: string): GcsFileHandle;
  getFiles(options: { prefix: string }): Promise<[GcsFileHandle[]]>;
}

/** Minimal `@google-cloud/storage` Storage client surface. */
interface GcsStorageClient {
  bucket(name: string): GcsBucketHandle;
}

const UPLOAD_STORAGE_SEGMENTS = new Set(
  Object.values(MEDIA_PURPOSE_POLICIES).map((policy) => policy.storageSegment),
);

/**
 * GCS-backed media storage for production deployments.
 *
 * Required env when enabled:
 * - `MEDIA_STORAGE_DRIVER=gcs`
 * - `GCS_MEDIA_BUCKET` — target bucket name
 * - `GCS_MEDIA_PUBLIC_BASE_URL` — optional CDN/base URL for public objects
 *
 * Authentication uses Application Default Credentials (GCP service account,
 * `GOOGLE_APPLICATION_CREDENTIALS`, or metadata server in Cloud Run/GKE).
 */
export class GcsMediaProvider implements MediaStorageProvider {
  private storageClient: GcsStorageClient | null = null;

  /**
   * @param bucket - GCS bucket name.
   * @param publicBaseUrl - Optional public base URL for returned object URLs.
   */
  constructor(
    private readonly bucket: string,
    private readonly publicBaseUrl?: string,
  ) {}

  /**
   * Upload bytes to GCS and return the public object URL.
   *
   * @param payload - Validated upload payload.
   * @returns Upload result with absolute public URL.
   */
  async upload(payload: MediaStorageUploadPayload): Promise<MediaStorageUploadResult> {
    const policy = MEDIA_PURPOSE_POLICIES[payload.purpose];
    const kind = resolveMediaKind(payload.mimeType)!;
    const filename = buildStoredFilename(payload.originalName, payload.mimeType, kind);
    const storageKey = buildLocalStorageKey(policy.storageSegment, filename);

    const bucket = await this.getBucket();
    await bucket.file(storageKey).save(payload.buffer, {
      contentType: payload.mimeType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return {
      url: buildGcsPublicUrl(storageKey, this.bucket, this.publicBaseUrl),
      storageKey,
      purpose: payload.purpose,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    };
  }

  /**
   * Delete a previously stored GCS object by storage key.
   *
   * @param storageKey - Object key (e.g. `avatars/foo.png`).
   */
  async delete(storageKey: string): Promise<void> {
    const normalised = normalizeStorageKey(storageKey);
    if (!normalised) return;

    const bucket = await this.getBucket();
    await bucket.file(normalised).delete().catch(() => undefined);
  }

  /**
   * List all managed objects under known upload segment prefixes.
   *
   * @returns Inventory entries for orphan cleanup comparison.
   */
  async listInventory(): Promise<LocalUploadInventoryEntry[]> {
    const bucket = await this.getBucket();
    const entries: LocalUploadInventoryEntry[] = [];

    for (const segment of UPLOAD_STORAGE_SEGMENTS) {
      const [files] = await bucket.getFiles({ prefix: `${segment}/` });
      for (const file of files) {
        const key = file.name ? normalizeStorageKey(file.name) : null;
        if (!key) continue;

        const updated = file.metadata?.updated ?? file.metadata?.timeCreated;
        const mtimeMs = updated ? Date.parse(updated) : Date.now();
        if (!Number.isFinite(mtimeMs)) continue;

        entries.push({ storageKey: key, mtimeMs });
      }
    }

    entries.sort((a, b) => a.storageKey.localeCompare(b.storageKey));
    return entries;
  }

  /**
   * Lazily construct the GCS SDK client.
   *
   * @returns Initialised Storage client.
   */
  private async getStorage(): Promise<GcsStorageClient> {
    if (this.storageClient) return this.storageClient;

    const module = await import("@google-cloud/storage");
    this.storageClient = new module.Storage() as unknown as GcsStorageClient;
    return this.storageClient;
  }

  /**
   * Resolve the configured bucket handle.
   */
  private async getBucket(): Promise<GcsBucketHandle> {
    const storage = await this.getStorage();
    return storage.bucket(this.bucket);
  }
}
