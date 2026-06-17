/**
 * @fileoverview Resolve the active media storage provider from environment.
 *
 * @module shared/lib/mediaStorage/resolveMediaStorageProvider
 */

import {
  DEFAULT_MEDIA_STORAGE_DRIVER,
  type MediaStorageDriver,
} from "@shared/constants/mediaStorage";
import { GcsMediaProvider } from "@shared/lib/mediaStorage/gcsMediaProvider";
import { LocalFilesystemMediaProvider } from "@shared/lib/mediaStorage/localFilesystemProvider";
import type { MediaStorageEnvConfig, MediaStorageProvider } from "@shared/lib/mediaStorage/types";

/** Cached singleton provider instance for the process lifetime. */
let cachedProvider: MediaStorageProvider | null = null;
let cachedDriver: MediaStorageDriver | null = null;

/**
 * Read media storage configuration from environment variables.
 *
 * @param env - Environment map (defaults to `process.env`).
 * @returns Normalised storage env config.
 */
export function readMediaStorageEnvConfig(
  env: NodeJS.ProcessEnv = process.env,
): MediaStorageEnvConfig {
  const rawDriver = env.MEDIA_STORAGE_DRIVER?.trim().toLowerCase();
  const driver: MediaStorageDriver =
    rawDriver === "gcs" ? "gcs" : DEFAULT_MEDIA_STORAGE_DRIVER;

  return {
    driver,
    projectRoot: process.cwd(),
    gcsBucket: env.GCS_MEDIA_BUCKET?.trim() || undefined,
    gcsPublicBaseUrl: env.GCS_MEDIA_PUBLIC_BASE_URL?.trim() || undefined,
  };
}

/**
 * Instantiate the configured {@link MediaStorageProvider}.
 *
 * @param config - Optional explicit config (tests); defaults to env.
 * @returns Active storage provider.
 * @throws When GCS driver is selected without required bucket config.
 */
export function resolveMediaStorageProvider(
  config?: MediaStorageEnvConfig,
): MediaStorageProvider {
  const resolved = config ?? readMediaStorageEnvConfig();

  if (cachedProvider && cachedDriver === resolved.driver && !config) {
    return cachedProvider;
  }

  let provider: MediaStorageProvider;

  if (resolved.driver === "gcs") {
    if (!resolved.gcsBucket) {
      throw new Error("GCS_MEDIA_BUCKET is required when MEDIA_STORAGE_DRIVER=gcs.");
    }
    provider = new GcsMediaProvider(resolved.gcsBucket, resolved.gcsPublicBaseUrl);
  } else {
    provider = new LocalFilesystemMediaProvider(resolved.projectRoot);
  }

  if (!config) {
    cachedProvider = provider;
    cachedDriver = resolved.driver;
  }

  return provider;
}

/**
 * Reset cached provider — for unit tests only.
 */
export function resetMediaStorageProviderCache(): void {
  cachedProvider = null;
  cachedDriver = null;
}
