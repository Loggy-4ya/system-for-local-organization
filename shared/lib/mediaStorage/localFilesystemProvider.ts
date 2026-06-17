/**
 * @fileoverview Local filesystem media storage provider.
 *
 * Writes validated uploads under `public/uploads/{purpose-segment}/` and returns
 * root-relative URLs served by Next.js static file hosting.
 *
 * @module shared/lib/mediaStorage/localFilesystemProvider
 */

import fs from "fs/promises";
import path from "path";
import { LOCAL_UPLOADS_ROOT_SEGMENT } from "@shared/constants/mediaStorage";
import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";
import {
  buildLocalPublicUrl,
  buildLocalStorageKey,
  buildStoredFilename,
  resolveMediaKind,
} from "@shared/lib/mediaStorage/mediaStorageRules";
import type {
  MediaStorageProvider,
  MediaStorageUploadPayload,
  MediaStorageUploadResult,
} from "@shared/lib/mediaStorage/types";

/**
 * Persist media on the local filesystem under `public/uploads/`.
 */
export class LocalFilesystemMediaProvider implements MediaStorageProvider {
  /**
   * @param projectRoot - Absolute path to the Next.js project root.
   */
  constructor(private readonly projectRoot: string) {}

  /**
   * Write upload bytes to disk and return the public URL path.
   *
   * @param payload - Validated upload payload.
   * @returns Upload result with `/uploads/...` URL.
   */
  async upload(payload: MediaStorageUploadPayload): Promise<MediaStorageUploadResult> {
    const policy = MEDIA_PURPOSE_POLICIES[payload.purpose];
    const kind = resolveMediaKind(payload.mimeType)!;
    const filename = buildStoredFilename(payload.originalName, payload.mimeType, kind);
    const storageKey = buildLocalStorageKey(policy.storageSegment, filename);

    const uploadDir = path.join(
      this.projectRoot,
      LOCAL_UPLOADS_ROOT_SEGMENT,
      policy.storageSegment,
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, payload.buffer);

    return {
      url: buildLocalPublicUrl(policy.storageSegment, filename),
      storageKey,
      purpose: payload.purpose,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    };
  }

  /**
   * Delete a previously stored file by its storage key.
   *
   * @param storageKey - Relative key (e.g. `avatars/foo.png`).
   */
  async delete(storageKey: string): Promise<void> {
    const safeKey = storageKey.replace(/^\/+/, "").replace(/\.\./g, "");
    const filePath = path.join(this.projectRoot, LOCAL_UPLOADS_ROOT_SEGMENT, safeKey);
    await fs.unlink(filePath).catch(() => undefined);
  }
}
