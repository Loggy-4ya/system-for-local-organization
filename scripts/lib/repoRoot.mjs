/**
 * @fileoverview Resolve the Nexus repository root from any script path depth.
 *
 * @module scripts/lib/repoRoot
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walk upward from `import.meta.url` until `package.json` is found.
 *
 * @param {string} fromUrl - Typically `import.meta.url` of the calling script.
 * @returns {string} Absolute path to the repository root.
 */
export function findRepoRoot(fromUrl) {
  let dir = dirname(fileURLToPath(fromUrl));
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  throw new Error("Could not find repository root (no package.json in parent chain).");
}
