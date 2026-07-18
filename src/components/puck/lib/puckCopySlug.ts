/**
 * @fileoverview Stable slug keys for Puck sidebar English copy → `puck.fieldLabels` lookups.
 *
 * Block and field configs keep canonical English `label` strings at module scope (tests,
 * Puck schema). UI layers slug those strings and resolve translations at render time.
 *
 * @module src/components/puck/lib/puckCopySlug
 */

/**
 * Convert a canonical English Puck sidebar label into a message catalog key segment.
 *
 * @param english - Source label from block config or shared option tables.
 * @returns Lowercase snake_case slug (max 96 chars).
 */
export function puckCopySlug(english: string): string {
  return english
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

export default puckCopySlug;
