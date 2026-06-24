/**
 * @fileoverview Layout tokens for the NexusComments Puck block band alignment.
 *
 * @module shared/lib/pageCommentsLayoutLogic
 *
 * Run: `npm run test:page-comments-layout-logic`
 * Registry: `.ai/docs/testing.md`
 */

/** Comments block width relative to the page content container. */
export type CommentsLayoutWidth = "full" | "medium" | "narrow";

/** Horizontal placement when the band is narrower than the container. */
export type CommentsLayoutAlign = "left" | "center" | "right";

/** Surface style for the comments block. */
export type CommentsViewMode = "launcher" | "topLiked";

/** Allowed width presets for validation. */
export const COMMENTS_LAYOUT_WIDTHS: readonly CommentsLayoutWidth[] = [
  "full",
  "medium",
  "narrow",
] as const;

/** Allowed alignment presets. */
export const COMMENTS_LAYOUT_ALIGNS: readonly CommentsLayoutAlign[] = [
  "left",
  "center",
  "right",
] as const;

/** Allowed view modes. */
export const COMMENTS_VIEW_MODES: readonly CommentsViewMode[] = ["launcher", "topLiked"] as const;

/**
 * Normalize a stored width token.
 *
 * @param raw - Puck prop value.
 * @returns Canonical width preset.
 */
export function normalizeCommentsLayoutWidth(
  raw: string | undefined | null,
): CommentsLayoutWidth {
  if (raw === "medium" || raw === "narrow") return raw;
  return "full";
}

/**
 * Normalize a stored alignment token.
 *
 * @param raw - Puck prop value.
 * @returns Canonical alignment preset.
 */
export function normalizeCommentsLayoutAlign(
  raw: string | undefined | null,
): CommentsLayoutAlign {
  if (raw === "left" || raw === "right") return raw;
  return "center";
}

/**
 * Normalize the comments view mode.
 *
 * @param raw - Puck prop value.
 * @returns Canonical view mode.
 */
export function normalizeCommentsViewMode(raw: string | undefined | null): CommentsViewMode {
  return raw === "topLiked" ? "topLiked" : "launcher";
}

/**
 * Clamp preview rotation interval for top-liked carousel (seconds).
 *
 * @param raw - Puck prop value.
 * @returns Safe interval between 3 and 12 seconds.
 */
export function clampCommentsPreviewIntervalSeconds(raw: number | undefined | null): number {
  if (!Number.isFinite(raw)) return 6;
  return Math.min(12, Math.max(3, Math.round(raw as number)));
}

/**
 * Resolve max-width for the comments band inside the page container.
 *
 * @param width - Band width preset.
 * @returns CSS max-width length.
 */
export function resolveCommentsBandMaxWidth(width: CommentsLayoutWidth): string {
  switch (width) {
    case "medium":
      return "min(100%, 72%)";
    case "narrow":
      return "min(100%, 28rem)";
    default:
      return "100%";
  }
}

/**
 * Resolve horizontal margin rules for band alignment.
 *
 * @param align - Band alignment preset.
 * @returns Margin inline styles for the band shell.
 */
export function resolveCommentsBandAlignStyle(
  align: CommentsLayoutAlign,
): { marginLeft: string; marginRight: string } {
  if (align === "center") {
    return { marginLeft: "auto", marginRight: "auto" };
  }
  if (align === "right") {
    return { marginLeft: "auto", marginRight: "0" };
  }
  return { marginLeft: "0", marginRight: "auto" };
}

/**
 * Build inline styles for the comments band shell.
 *
 * @param width - Band width preset.
 * @param align - Band alignment preset.
 * @returns CSS properties for width-constrained placement.
 */
export function resolveCommentsBandStyle(
  width: CommentsLayoutWidth,
  align: CommentsLayoutAlign,
): { width: string; maxWidth: string; marginLeft: string; marginRight: string } {
  return {
    width: "100%",
    maxWidth: resolveCommentsBandMaxWidth(width),
    ...resolveCommentsBandAlignStyle(align),
  };
}
