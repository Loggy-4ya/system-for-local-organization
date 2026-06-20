/**
 * @fileoverview List files stored under `public/uploads/` for orphan cleanup scans.
 *
 * @module shared/lib/mediaStorage/localUploadInventory
 *
 * Tests: `npm run test:orphan-upload-cleanup`
 * Registry: `.ai/docs/testing.md`
 */

import fs from "fs/promises";
import path from "path";
import {
  LOCAL_UPLOADS_ROOT_SEGMENT,
  MEDIA_PURPOSE_POLICIES,
} from "@shared/constants/mediaStorage";
import type { LocalUploadInventoryEntry } from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";

/**
 * Enumerate all managed upload files on the local filesystem.
 *
 * Skips `.gitkeep` placeholders and unknown segment directories.
 *
 * @param projectRoot - Absolute Next.js project root.
 * @returns Inventory entries with storage keys and mtimes.
 */
export async function listLocalUploadInventory(
  projectRoot: string,
): Promise<LocalUploadInventoryEntry[]> {
  const uploadsRoot = path.join(projectRoot, LOCAL_UPLOADS_ROOT_SEGMENT);
  const entries: LocalUploadInventoryEntry[] = [];

  for (const policy of Object.values(MEDIA_PURPOSE_POLICIES)) {
    const segmentDir = path.join(uploadsRoot, policy.storageSegment);

    let files: string[];
    try {
      files = await fs.readdir(segmentDir);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      throw err;
    }

    for (const filename of files) {
      if (filename === ".gitkeep") continue;

      const filePath = path.join(segmentDir, filename);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      entries.push({
        storageKey: `${policy.storageSegment}/${filename}`,
        mtimeMs: stat.mtimeMs,
      });
    }
  }

  entries.sort((a, b) => a.storageKey.localeCompare(b.storageKey));
  return entries;
}
