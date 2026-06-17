/**
 * @fileoverview Google Cloud Storage media provider (deployment stub).
 *
 * The interface and env wiring are in place so production can switch
 * `MEDIA_STORAGE_DRIVER=gcs` without changing API routes or UI callers.
 * Full GCS SDK integration is deferred until deployment credentials exist.
 *
 * @module shared/lib/mediaStorage/gcsMediaProvider
 */

import type {
  MediaStorageProvider,
  MediaStorageUploadPayload,
  MediaStorageUploadResult,
} from "@shared/lib/mediaStorage/types";

/**
 * GCS-backed media storage — not yet implemented.
 *
 * Required env when enabled:
 * - `MEDIA_STORAGE_DRIVER=gcs`
 * - `GCS_MEDIA_BUCKET` — target bucket name
 * - `GCS_MEDIA_PUBLIC_BASE_URL` — optional CDN/base URL for public objects
 */
export class GcsMediaProvider implements MediaStorageProvider {
  /**
   * @param bucket - GCS bucket name.
   * @param publicBaseUrl - Optional public base URL for returned object URLs.
   */
  constructor(
    private readonly bucket: string,
    private readonly publicBaseUrl?: string,
  ) {}

  /**
   * @throws Always — SDK upload not wired yet.
   */
  async upload(_payload: MediaStorageUploadPayload): Promise<MediaStorageUploadResult> {
    void this.bucket;
    void this.publicBaseUrl;
    throw new Error(
      "GCS media storage is not implemented yet. Set MEDIA_STORAGE_DRIVER=local for development.",
    );
  }
}
