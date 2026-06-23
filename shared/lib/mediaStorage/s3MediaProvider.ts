/**
 * @fileoverview Amazon S3 media provider.
 *
 * Stores objects as `{segment}/{filename}` keys inside `S3_MEDIA_BUCKET`.
 * Public URLs use `S3_MEDIA_PUBLIC_BASE_URL` when set, otherwise the default
 * virtual-hosted-style S3 object URL.
 *
 * @module shared/lib/mediaStorage/s3MediaProvider
 *
 * Tests: `npm run test:upload-reference-utils` (URL/key helpers)
 * Registry: `.ai/docs/testing.md`
 */

import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";
import {
  buildLocalStorageKey,
  buildStoredFilename,
  resolveMediaKind,
} from "@shared/lib/mediaStorage/mediaStorageRules";
import type { LocalUploadInventoryEntry } from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";
import { buildS3PublicUrl } from "@shared/lib/mediaStorage/s3ObjectKey";
import { normalizeStorageKey } from "@shared/lib/mediaStorage/storageObjectKey";
import type {
  MediaStorageProvider,
  MediaStorageUploadPayload,
  MediaStorageUploadResult,
} from "@shared/lib/mediaStorage/types";

/** Minimal S3 client surface used by this provider. */
interface S3ClientHandle {
  send(command: unknown): Promise<unknown>;
}

const UPLOAD_STORAGE_SEGMENTS = new Set(
  Object.values(MEDIA_PURPOSE_POLICIES).map((policy) => policy.storageSegment),
);

/**
 * S3-backed media storage for production deployments on AWS.
 *
 * Required env when enabled:
 * - `MEDIA_STORAGE_DRIVER=s3`
 * - `S3_MEDIA_BUCKET` — target bucket name
 * - `S3_MEDIA_REGION` or `AWS_REGION` — bucket region
 * - `S3_MEDIA_PUBLIC_BASE_URL` — optional CDN/base URL for public objects
 *
 * Authentication uses the AWS SDK default credential chain (`AWS_ACCESS_KEY_ID` /
 * `AWS_SECRET_ACCESS_KEY`, shared config files, or IAM role on EC2/ECS/Lambda).
 */
export class S3MediaProvider implements MediaStorageProvider {
  private s3Client: S3ClientHandle | null = null;

  /**
   * @param bucket - S3 bucket name.
   * @param region - AWS region for the bucket.
   * @param publicBaseUrl - Optional public base URL for returned object URLs.
   */
  constructor(
    private readonly bucket: string,
    private readonly region: string,
    private readonly publicBaseUrl?: string,
  ) {}

  /**
   * Upload bytes to S3 and return the public object URL.
   *
   * @param payload - Validated upload payload.
   * @returns Upload result with absolute public URL.
   */
  async upload(payload: MediaStorageUploadPayload): Promise<MediaStorageUploadResult> {
    const policy = MEDIA_PURPOSE_POLICIES[payload.purpose];
    const kind = resolveMediaKind(payload.mimeType)!;
    const filename = buildStoredFilename(payload.originalName, payload.mimeType, kind);
    const storageKey = buildLocalStorageKey(policy.storageSegment, filename);

    const client = await this.getClient();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: payload.buffer,
        ContentType: payload.mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return {
      url: buildS3PublicUrl(storageKey, this.bucket, this.region, this.publicBaseUrl),
      storageKey,
      purpose: payload.purpose,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    };
  }

  /**
   * Delete a previously stored S3 object by storage key.
   *
   * @param storageKey - Object key (e.g. `avatars/foo.png`).
   */
  async delete(storageKey: string): Promise<void> {
    const normalised = normalizeStorageKey(storageKey);
    if (!normalised) return;

    const client = await this.getClient();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    await client
      .send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: normalised,
        }),
      )
      .catch(() => undefined);
  }

  /**
   * List all managed objects under known upload segment prefixes.
   *
   * @returns Inventory entries for orphan cleanup comparison.
   */
  async listInventory(): Promise<LocalUploadInventoryEntry[]> {
    const client = await this.getClient();
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const entries: LocalUploadInventoryEntry[] = [];

    for (const segment of UPLOAD_STORAGE_SEGMENTS) {
      let continuationToken: string | undefined;

      do {
        const response = (await client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: `${segment}/`,
            ContinuationToken: continuationToken,
          }),
        )) as {
          Contents?: Array<{ Key?: string; LastModified?: Date }>;
          IsTruncated?: boolean;
          NextContinuationToken?: string;
        };

        for (const object of response.Contents ?? []) {
          const key = object.Key ? normalizeStorageKey(object.Key) : null;
          if (!key) continue;

          const mtimeMs = object.LastModified?.getTime() ?? Date.now();
          if (!Number.isFinite(mtimeMs)) continue;

          entries.push({ storageKey: key, mtimeMs });
        }

        continuationToken = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (continuationToken);
    }

    entries.sort((a, b) => a.storageKey.localeCompare(b.storageKey));
    return entries;
  }

  /**
   * Lazily construct the S3 SDK client.
   *
   * @returns Initialised S3 client.
   */
  private async getClient(): Promise<S3ClientHandle> {
    if (this.s3Client) return this.s3Client;

    const { S3Client } = await import("@aws-sdk/client-s3");
    this.s3Client = new S3Client({ region: this.region }) as unknown as S3ClientHandle;
    return this.s3Client;
  }
}
