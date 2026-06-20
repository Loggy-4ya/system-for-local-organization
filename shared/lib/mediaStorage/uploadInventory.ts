/**
 * @fileoverview Driver-aware upload inventory listing for orphan cleanup scans.
 *
 * @module shared/lib/mediaStorage/uploadInventory
 *
 * Tests: `npm run test:orphan-upload-cleanup`
 * Registry: `.ai/docs/testing.md`
 */

import type { LocalUploadInventoryEntry } from "@shared/lib/mediaStorage/orphanUploadCleanupLogic";
import { resolveMediaStorageProvider } from "@shared/lib/mediaStorage/resolveMediaStorageProvider";
import type { MediaStorageEnvConfig } from "@shared/lib/mediaStorage/types";

/**
 * List all managed upload objects for the active storage driver.
 *
 * @param config - Resolved media storage env config.
 * @returns Inventory entries with storage keys and last-modified times.
 * @throws When the active provider does not implement inventory listing.
 */
export async function listUploadInventory(
  config: MediaStorageEnvConfig,
): Promise<LocalUploadInventoryEntry[]> {
  const provider = resolveMediaStorageProvider(config);
  if (!provider.listInventory) {
    throw new Error("Active media provider does not support inventory listing.");
  }

  return provider.listInventory();
}
