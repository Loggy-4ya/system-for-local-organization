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
  pill: "var(--radius-full)",
  circle: "50%",
} as const;

/** Radius select options with pixel hints (4px / 8px / 12px). */
export const RADIUS_SELECT_OPTIONS = [
  { label: "None (0px)", value: RADIUS_TOKEN_VALUES.none },
  { label: "Small (4px)", value: RADIUS_TOKEN_VALUES.sm },
  { label: "Medium (8px)", value: RADIUS_TOKEN_VALUES.md },
  { label: "Large (12px)", value: RADIUS_TOKEN_VALUES.lg },
  { label: "Custom", value: "custom" },
] as const;

/** Radius options including circle and pill variants for image/button blocks. */
export const RADIUS_EXTENDED_SELECT_OPTIONS = [
  ...RADIUS_SELECT_OPTIONS.filter((opt) => opt.value !== "custom"),
  { label: "Circle (50%)", value: RADIUS_TOKEN_VALUES.circle },
  { label: "Pill", value: RADIUS_TOKEN_VALUES.pill },
  { label: "Custom", value: "custom" },
] as const;

/** Island / image radius options (no custom entry). */
export const RADIUS_PRESET_OPTIONS = RADIUS_SELECT_OPTIONS.filter(
  (opt) => opt.value !== "custom",
);

/** Legacy layout gap aliases mapped to spacing tokens. */
export const LEGACY_LAYOUT_GAP_MAP: Record<string, string> = {
  none: "none",
  small: "sm",
  medium: "md",
  large: "lg",
};

/** Layout gap / padding presets — full spacing scale with custom. */
export const LAYOUT_GAP_OPTIONS = [...SPACING_TOKEN_LABELS] as Array<{
  label: string;
  value: string;
}>;

/** Legacy section padding aliases mapped to canonical tokens. */
export const LEGACY_SECTION_PADDING_MAP: Record<string, string> = {
  none: "none",
  small: "sm",
  normal: "md",
  large: "lg",
};

/** Section vertical padding presets with resolved sizes. */
export const SECTION_PADDING_OPTIONS = [
  { label: "None (0px)", value: "none" },
  { label: "Small (8px vertical)", value: "sm" },
  { label: "Normal (24px vertical)", value: "md" },
  { label: "Large (48px vertical)", value: "lg" },
  { label: "Custom", value: "custom" },
] as const;

/** Section max-width presets with custom entry. */
export const SECTION_MAX_WIDTH_OPTIONS = [
  ...CONTENT_WIDTH_OPTIONS,
  { label: "Custom", value: "custom" as const },
];

/** Carousel slides visible presets (short labels — hover for full description). */
export const CAROUSEL_SLIDES_PER_VIEW_OPTIONS = [
  { label: "Auto", value: "auto", title: "Auto (responsive)" },
  { label: "1 slide", value: "1" },
  { label: "2 slides", value: "2" },
  { label: "3 slides", value: "3" },
] as const;

/** How many slides advance per arrow click / autoplay step. */
export const CAROUSEL_SCROLL_STEP_OPTIONS = [
  { label: "1 slide", value: "1" },
  { label: "2 slides", value: "2" },
  { label: "3 slides", value: "3" },
  { label: "Full page", value: "page", title: "Full page (matches visible count)" },
] as const;

/** Carousel slide fill behavior for image blocks. */
export { CAROUSEL_MEDIA_FILL_OPTIONS } from "./carouselMediaFill";

/** Image/video fit behavior (cover vs contain). */
export { MEDIA_FIT_OPTIONS } from "./mediaFitMode";

/** Shadow depth options for images and cards. */
export const SHADOW_DEPTH_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Soft (4px blur)", value: "0 4px 12px rgba(0,0,0,0.1)" },
  { label: "Medium (8px blur)", value: "0 8px 24px rgba(0,0,0,0.2)" },
  { label: "Strong (8px deep)", value: "0 8px 24px -4px rgba(0,0,0,0.35)" },
  { label: "Custom", value: "custom" },
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
  { label: "Custom", value: "custom" },
] as const;

/** Island corner radius presets (sm/md/lg token keys). */
export const ISLAND_RADIUS_OPTIONS = [
  { label: "Small (4px)", value: "sm" },
  { label: "Medium (8px)", value: "md" },
  { label: "Large (12px)", value: "lg" },
  { label: "Custom", value: "custom" },
] as const;

/** Island max-width presets (content width tokens + custom). */
export const ISLAND_MAX_WIDTH_OPTIONS = [
  ...CONTENT_WIDTH_OPTIONS,
  { label: "Custom", value: "custom" as const },
];

/** List item vertical gap presets — full spacing scale with custom. */
export const LIST_ITEM_SPACING_OPTIONS = [...SPACING_TOKEN_LABELS] as Array<{
  label: string;
  value: string;
}>;

/** Divider / border thickness presets. */
export const THICKNESS_OPTIONS = [
  { label: "Thin (1px)", value: "1px" },
  { label: "Medium (2px)", value: "2px" },
  { label: "Thick (4px)", value: "4px" },
  { label: "Custom", value: "custom" },
] as const;

/** Width percentage presets for dividers and spacer lines. */
export const WIDTH_PERCENT_OPTIONS = [
  { label: "Full (100%)", value: "100%" },
  { label: "80%", value: "80%" },
  { label: "50%", value: "50%" },
  { label: "30%", value: "30%" },
  { label: "Custom", value: "custom" },
] as const;

/** Narrower width presets for horizontal dividers. */
export const DIVIDER_WIDTH_OPTIONS = [
  { label: "Full (100%)", value: "100%" },
  { label: "80%", value: "80%" },
  { label: "50%", value: "50%" },
  { label: "20%", value: "20%" },
  { label: "Custom", value: "custom" },
] as const;

/** Body text font size presets. */
export const FONT_SIZE_OPTIONS = [
  { label: "Small (13px)", value: "0.8125rem" },
  { label: "Normal (15px)", value: "0.9375rem" },
  { label: "Large (18px)", value: "1.125rem" },
  { label: "Custom", value: "custom" },
] as const;

/** Body text line height presets. */
export const LINE_HEIGHT_OPTIONS = [
  { label: "Tight (1.4)", value: "1.4" },
  { label: "Normal (1.6)", value: "1.6" },
  { label: "Relaxed (1.8)", value: "1.8" },
  { label: "Custom", value: "custom" },
] as const;

/** Image width presets. */
export const IMAGE_WIDTH_OPTIONS = [
  { label: "Full (100%)", value: "100%" },
  { label: "Medium (640px)", value: "640px" },
  { label: "Large (960px)", value: "960px" },
  { label: "Custom", value: "custom" },
] as const;

/** Image height presets. */
export const IMAGE_HEIGHT_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Small (180px)", value: "180px" },
  { label: "Medium (360px)", value: "360px" },
  { label: "Custom", value: "custom" },
] as const;

/** Grid column count slider options (1–12). */
export const GRID_COLUMN_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
  title: `${i + 1} Column${i > 0 ? "s" : ""}`,
}));

/** Grid item column span slider options (1–12). */
export const GRID_SPAN_COL_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
  title: `Span ${i + 1}`,
}));

/** Grid item row span slider options (1–6). */
export const GRID_SPAN_ROW_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
  title: `Span ${i + 1}`,
}));

/** Video max-width presets including none and custom. */
export const VIDEO_MAX_WIDTH_OPTIONS = [
  { label: "None", value: "none" },
  ...SECTION_MAX_WIDTH_OPTIONS,
] as const;

/** Video width presets — full width, content tokens, and custom. */
export const VIDEO_WIDTH_OPTIONS = [
  { label: "Full (100%)", value: "100%" },
  ...CONTENT_WIDTH_OPTIONS,
  { label: "Custom", value: "custom" as const },
] as const;

/** Re-export spacing labels for blocks that use spacing tokens. */
export { SPACING_TOKEN_LABELS, CONTENT_WIDTH_OPTIONS };

/** Universal media aspect-ratio sidebar options (video, image, carousel fill). */
export { MEDIA_ASPECT_RATIO_OPTIONS } from "./mediaAspectRatio";
