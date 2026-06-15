/**
 * @fileoverview Media fit modes for image/video blocks (cover vs contain).
 *
 * Tests: `tests/puck/lib/embedMedia.test.ts` — `npm run test:embed-media`
 *
 * @module src/components/puck/lib/mediaFitMode
 */

/** How media fills its frame — crop to fill or letterbox inside. */
export type MediaFitMode = "cover" | "contain";

/** Sidebar options for image/video fit behavior. */
export const MEDIA_FIT_OPTIONS = [
  { label: "Cover (fill, crop if needed)", value: "cover" },
  { label: "Contain (show full media)", value: "contain" },
] as const;

/**
 * Normalize stored fit mode with safe default.
 *
 * @param value - Raw prop from Puck data.
 * @returns Canonical fit mode.
 */
export function normalizeMediaFitMode(value: unknown): MediaFitMode {
  return value === "contain" ? "contain" : "cover";
}

/**
 * Map fit mode to CSS `object-fit` keyword.
 *
 * @param mode - Resolved fit mode.
 * @returns `cover` or `contain`.
 */
export function mediaFitToObjectFit(mode: MediaFitMode): "cover" | "contain" {
  return mode;
}
