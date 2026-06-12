/**
 * @fileoverview Human-readable Puck sidebar select/radio option labels with resolved sizes.
 *
 * @module src/components/puck/lib/fieldOptionLabels
 */

import { CONTENT_WIDTH_OPTIONS } from "./contentWidthTokens";
import { SPACING_TOKEN_LABELS } from "./spacingDisplay";

/** Shared radius preset values stored on blocks. */
export const RADIUS_TOKEN_VALUES = {
  none: "0",
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
} as const;

/** Radius select options with pixel hints (4px / 8px / 12px). */
export const RADIUS_SELECT_OPTIONS = [
  { label: "None (0px)", value: RADIUS_TOKEN_VALUES.none },
  { label: "Small (4px)", value: RADIUS_TOKEN_VALUES.sm },
  { label: "Medium (8px)", value: RADIUS_TOKEN_VALUES.md },
  { label: "Large (12px)", value: RADIUS_TOKEN_VALUES.lg },
  { label: "Custom", value: "custom" },
] as const;

/** Island / image radius options (no custom entry). */
export const RADIUS_PRESET_OPTIONS = RADIUS_SELECT_OPTIONS.filter(
  (opt) => opt.value !== "custom",
);

/** Section vertical padding presets with resolved sizes. */
export const SECTION_PADDING_OPTIONS = [
  { label: "None (0px)", value: "none" },
  { label: "Small (8px vertical)", value: "small" },
  { label: "Normal (24px vertical)", value: "normal" },
  { label: "Large (48px vertical)", value: "large" },
] as const;

/** Carousel slides visible presets. */
export const CAROUSEL_SLIDES_PER_VIEW_OPTIONS = [
  { label: "Auto (responsive)", value: "auto" },
  { label: "1 slide", value: "1" },
  { label: "2 slides", value: "2" },
  { label: "3 slides", value: "3" },
] as const;

/** How many slides advance per arrow click / autoplay step. */
export const CAROUSEL_SCROLL_STEP_OPTIONS = [
  { label: "1 slide", value: "1" },
  { label: "2 slides", value: "2" },
  { label: "3 slides", value: "3" },
  { label: "Full page (matches visible count)", value: "page" },
] as const;

/** Carousel slide fill behavior for image blocks. */
export { CAROUSEL_MEDIA_FILL_OPTIONS } from "./carouselMediaFill";

/** Shadow depth options for images and cards. */
export const SHADOW_DEPTH_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Soft (4px blur)", value: "0 4px 12px rgba(0,0,0,0.1)" },
  { label: "Medium (8px blur)", value: "0 8px 24px rgba(0,0,0,0.2)" },
  { label: "Strong (8px deep)", value: "0 8px 24px -4px rgba(0,0,0,0.35)" },
] as const;

/** Button size presets. */
export const BUTTON_SIZE_OPTIONS = [
  { label: "Small (32px height)", value: "sm" },
  { label: "Medium (36px height)", value: "md" },
  { label: "Large (40px height)", value: "lg" },
] as const;

/** Tab strip size presets. */
export const TAB_SIZE_OPTIONS = [
  { label: "Small (11px text)", value: "sm" },
  { label: "Medium (12px text)", value: "md" },
] as const;

/** Island border width presets. */
export const ISLAND_BORDER_WIDTH_OPTIONS = [
  { label: "None (0px)", value: "none" },
  { label: "Thin (1px)", value: "thin" },
  { label: "Medium (2px)", value: "medium" },
] as const;

/** Island corner radius presets (sm/md/lg token keys). */
export const ISLAND_RADIUS_OPTIONS = [
  { label: "Small (4px)", value: "sm" },
  { label: "Medium (8px)", value: "md" },
  { label: "Large (12px)", value: "lg" },
] as const;

/** List item vertical gap presets. */
export const LIST_ITEM_SPACING_OPTIONS = [
  { label: "Tight (4px)", value: "sm" },
  { label: "Normal (8px)", value: "md" },
] as const;

/** Layout gap presets shared by grid/columns. */
export const LAYOUT_GAP_OPTIONS = [
  { label: "None (0px)", value: "none" },
  { label: "Small (8px)", value: "small" },
  { label: "Medium (16px)", value: "medium" },
  { label: "Large (24px)", value: "large" },
] as const;

/** Re-export spacing labels for blocks that use spacing tokens. */
export { SPACING_TOKEN_LABELS, CONTENT_WIDTH_OPTIONS };
