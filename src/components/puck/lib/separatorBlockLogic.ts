/**
 * @fileoverview Presets, prop normalization, and render resolution for the unified Spacer & Divider block.
 *
 * Replaces the former split between layout spacers and content dividers with one
 * block whose `stylePreset` bundles size, line visibility, thickness, width, and alignment.
 *
 * Tests: tests/puck/lib/separatorBlockLogic.test.ts
 * Run: npm run test:separator-block
 *
 * @module src/components/puck/lib/separatorBlockLogic
 */

import {
  DIVIDER_WIDTH_OPTIONS,
  THICKNESS_OPTIONS,
} from "./fieldOptionLabels";
import { resolveNexusColor } from "./nexusColorTokens";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  resolvePresetDimension,
  type PresetDimensionValue,
} from "./resolvePresetDimension";
import { resolveSpacingDimension } from "./resolveSpacingDimension";

/** Bundled sidebar preset ids for the unified separator block. */
export type SeparatorStylePreset =
  | "space-xs"
  | "space-sm"
  | "space-md"
  | "space-lg"
  | "space-xl"
  | "space-2xl"
  | "line-full-thin"
  | "line-full-medium"
  | "line-full-thick"
  | "line-center-50"
  | "line-center-20"
  | "break-sm"
  | "break-md"
  | "break-lg"
  | "custom";

/** Sidebar select options for {@link SeparatorStylePreset}. */
export const SEPARATOR_STYLE_PRESET_OPTIONS: Array<{
  label: string;
  value: SeparatorStylePreset;
}> = [
  { label: "Space — XS (4px)", value: "space-xs" },
  { label: "Space — SM (8px)", value: "space-sm" },
  { label: "Space — MD (16px)", value: "space-md" },
  { label: "Space — LG (24px)", value: "space-lg" },
  { label: "Space — XL (32px)", value: "space-xl" },
  { label: "Space — 2XL (48px)", value: "space-2xl" },
  { label: "Divider — Full width, thin", value: "line-full-thin" },
  { label: "Divider — Full width, medium", value: "line-full-medium" },
  { label: "Divider — Full width, thick", value: "line-full-thick" },
  { label: "Divider — Centered 50%", value: "line-center-50" },
  { label: "Divider — Centered 20%", value: "line-center-20" },
  { label: "Section break — Small", value: "break-sm" },
  { label: "Section break — Medium", value: "break-md" },
  { label: "Section break — Large", value: "break-lg" },
  { label: "Custom", value: "custom" },
];

/** Flat props consumed by the unified separator render path. */
export interface SeparatorBlockProps {
  stylePreset?: SeparatorStylePreset | string;
  height?: unknown;
  showLine?: "yes" | "no";
  thickness?: unknown;
  borderColorPreset?: string;
  colorOverride?: string;
  width?: unknown;
  align?: "left" | "center" | "right";
  /** @deprecated Legacy spacer field — migrated to borderColorPreset. */
  lineColor?: string;
  /** @deprecated Legacy spacer field — migrated to width. */
  lineWidth?: unknown;
}

/** Default flat props for a new separator block. */
export const SEPARATOR_DEFAULT_PROPS: Required<
  Pick<
    SeparatorBlockProps,
    "stylePreset" | "height" | "showLine" | "thickness" | "borderColorPreset" | "width" | "align"
  >
> = {
  stylePreset: "space-md",
  height: { preset: "md", custom: "16px" },
  showLine: "no",
  thickness: { preset: "1px", custom: "1px" },
  borderColorPreset: "border-default",
  width: { preset: "100%", custom: "100%" },
  align: "center",
};

const HEIGHT_DEFAULTS = { preset: "md", custom: "16px" };
const THICKNESS_PRESET_VALUES = presetValuesFromOptions(THICKNESS_OPTIONS);
const THICKNESS_DEFAULTS = { preset: "1px", custom: "1px" };
const WIDTH_PRESET_VALUES = presetValuesFromOptions(DIVIDER_WIDTH_OPTIONS);
const WIDTH_DEFAULTS = { preset: "100%", custom: "100%" };

const THICKNESS_MAP = Object.fromEntries(
  THICKNESS_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
);
const WIDTH_MAP = Object.fromEntries(
  DIVIDER_WIDTH_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
);

const ALIGN_STYLES: Record<"left" | "center" | "right", string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

/** Resolved CSS values for the separator container and optional line. */
export interface SeparatorRenderModel {
  containerHeight: string;
  showLine: boolean;
  lineWidth: string;
  lineThickness: string;
  lineColor: string;
  lineAlign: "left" | "center" | "right";
}

/**
 * Return bundled flat props for a non-custom style preset.
 *
 * @param preset - Bundled preset id.
 * @returns Flat prop overrides (excluding `stylePreset`).
 */
export function applySeparatorStylePreset(
  preset: SeparatorStylePreset,
): Omit<SeparatorBlockProps, "stylePreset"> {
  switch (preset) {
    case "space-xs":
      return { height: { preset: "xs", custom: "4px" }, showLine: "no" };
    case "space-sm":
      return { height: { preset: "sm", custom: "8px" }, showLine: "no" };
    case "space-md":
      return { height: { preset: "md", custom: "16px" }, showLine: "no" };
    case "space-lg":
      return { height: { preset: "lg", custom: "24px" }, showLine: "no" };
    case "space-xl":
      return { height: { preset: "xl", custom: "32px" }, showLine: "no" };
    case "space-2xl":
      return { height: { preset: "2xl", custom: "48px" }, showLine: "no" };
    case "line-full-thin":
      return {
        height: { preset: "none", custom: "0px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "line-full-medium":
      return {
        height: { preset: "none", custom: "0px" },
        showLine: "yes",
        thickness: { preset: "2px", custom: "2px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "line-full-thick":
      return {
        height: { preset: "none", custom: "0px" },
        showLine: "yes",
        thickness: { preset: "4px", custom: "4px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "line-center-50":
      return {
        height: { preset: "none", custom: "0px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "50%", custom: "50%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "line-center-20":
      return {
        height: { preset: "none", custom: "0px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "20%", custom: "20%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "break-sm":
      return {
        height: { preset: "sm", custom: "8px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "break-md":
      return {
        height: { preset: "md", custom: "16px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    case "break-lg":
      return {
        height: { preset: "lg", custom: "24px" },
        showLine: "yes",
        thickness: { preset: "1px", custom: "1px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
        borderColorPreset: "border-default",
      };
    default:
      return {};
  }
}

/**
 * Infer the closest bundled preset from granular props (legacy pages without `stylePreset`).
 *
 * @param props - Flat separator props.
 * @returns Matching preset id or `custom`.
 */
export function inferSeparatorStylePreset(props: SeparatorBlockProps): SeparatorStylePreset {
  if (props.stylePreset === "custom") {
    return "custom";
  }
  if (props.stylePreset && props.stylePreset !== "custom") {
    return props.stylePreset as SeparatorStylePreset;
  }

  const hasExplicitHeight = props.height !== undefined && props.height !== null;
  const hasDividerProps = Boolean(
    props.thickness ||
      props.width ||
      props.borderColorPreset ||
      props.lineColor ||
      props.lineWidth,
  );
  const heightNorm = normalizePresetDimensionValue(
    props.height,
    undefined,
    presetValuesFromOptions([
      { label: "None", value: "none" },
      { label: "XS", value: "xs" },
      { label: "SM", value: "sm" },
      { label: "MD", value: "md" },
      { label: "LG", value: "lg" },
      { label: "XL", value: "xl" },
      { label: "2XL", value: "2xl" },
      { label: "Custom", value: "custom" },
    ]),
    hasDividerProps && !hasExplicitHeight
      ? { preset: "none", custom: "0px" }
      : HEIGHT_DEFAULTS,
  );

  const showLine =
    props.showLine === "yes" ||
    Boolean(props.thickness || props.lineColor || props.lineWidth || props.borderColorPreset);

  if (!showLine) {
    const spaceMap: Record<string, SeparatorStylePreset> = {
      xs: "space-xs",
      sm: "space-sm",
      md: "space-md",
      lg: "space-lg",
      xl: "space-xl",
      "2xl": "space-2xl",
    };
    return spaceMap[heightNorm.preset] ?? "custom";
  }

  const thicknessNorm = normalizePresetDimensionValue(
    props.thickness,
    undefined,
    THICKNESS_PRESET_VALUES,
    THICKNESS_DEFAULTS,
  );
  const widthNorm = normalizePresetDimensionValue(
    props.width ?? props.lineWidth,
    undefined,
    WIDTH_PRESET_VALUES,
    WIDTH_DEFAULTS,
  );
  const heightToken = heightNorm.preset;

  if (heightToken !== "none" && heightToken !== "custom") {
    const breakMap: Record<string, SeparatorStylePreset> = {
      sm: "break-sm",
      md: "break-md",
      lg: "break-lg",
    };
    if (breakMap[heightToken]) return breakMap[heightToken];
  }

  if (widthNorm.preset === "50%") return "line-center-50";
  if (widthNorm.preset === "20%") return "line-center-20";
  if (thicknessNorm.preset === "2px") return "line-full-medium";
  if (thicknessNorm.preset === "4px") return "line-full-thick";
  if (showLine) return "line-full-thin";

  return "custom";
}

/**
 * Normalize stored separator props and apply bundled presets when selected.
 *
 * @param props - Raw flat props from Puck storage.
 * @returns Normalized flat props for render.
 */
export function normalizeSeparatorProps(props: SeparatorBlockProps): SeparatorBlockProps {
  const migrated: SeparatorBlockProps = { ...props };

  if (migrated.lineColor && !migrated.borderColorPreset) {
    migrated.borderColorPreset = migrated.lineColor;
  }
  if (migrated.lineWidth && !migrated.width) {
    migrated.width = migrated.lineWidth;
  }
  if (migrated.showLine === undefined && migrated.thickness) {
    migrated.showLine = "yes";
  }

  const preset: SeparatorStylePreset =
    migrated.stylePreset === "custom"
      ? "custom"
      : migrated.stylePreset && migrated.stylePreset !== "custom"
        ? (migrated.stylePreset as SeparatorStylePreset)
        : inferSeparatorStylePreset(migrated);

  migrated.stylePreset = preset;

  if (preset !== "custom") {
    return {
      ...migrated,
      ...applySeparatorStylePreset(preset),
      stylePreset: preset,
    };
  }

  return {
    ...SEPARATOR_DEFAULT_PROPS,
    ...migrated,
    stylePreset: "custom",
    height: migrated.height ?? SEPARATOR_DEFAULT_PROPS.height,
    showLine: migrated.showLine ?? SEPARATOR_DEFAULT_PROPS.showLine,
    thickness: migrated.thickness ?? SEPARATOR_DEFAULT_PROPS.thickness,
    borderColorPreset: migrated.borderColorPreset ?? SEPARATOR_DEFAULT_PROPS.borderColorPreset,
    width: migrated.width ?? SEPARATOR_DEFAULT_PROPS.width,
    align: migrated.align ?? SEPARATOR_DEFAULT_PROPS.align,
  };
}

/**
 * Resolve separator props to CSS-ready values for render.
 *
 * @param props - Normalized flat separator props.
 * @returns Container and line CSS model.
 */
export function resolveSeparatorRenderModel(props: SeparatorBlockProps): SeparatorRenderModel {
  const normalized = normalizeSeparatorProps(props);
  const heightNorm = normalizePresetDimensionValue(
    normalized.height,
    undefined,
    presetValuesFromOptions([
      { label: "None", value: "none" },
      { label: "XS", value: "xs" },
      { label: "SM", value: "sm" },
      { label: "MD", value: "md" },
      { label: "LG", value: "lg" },
      { label: "XL", value: "xl" },
      { label: "2XL", value: "2xl" },
      { label: "Custom", value: "custom" },
    ]),
    HEIGHT_DEFAULTS,
  );
  const thicknessNorm = normalizePresetDimensionValue(
    normalized.thickness,
    undefined,
    THICKNESS_PRESET_VALUES,
    THICKNESS_DEFAULTS,
  );
  const widthNorm = normalizePresetDimensionValue(
    normalized.width,
    undefined,
    WIDTH_PRESET_VALUES,
    WIDTH_DEFAULTS,
  );

  const showLine = normalized.showLine === "yes";
  const lineColor = normalized.borderColorPreset
    ? resolveNexusColor(normalized.borderColorPreset, "var(--color-border-default)")
    : normalized.colorOverride || normalized.lineColor || "var(--color-border-default)";

  return {
    containerHeight: resolveSpacingDimension(heightNorm, HEIGHT_DEFAULTS),
    showLine,
    lineWidth: resolvePresetDimension(widthNorm.preset, widthNorm.custom, WIDTH_MAP, "100%"),
    lineThickness: resolvePresetDimension(
      thicknessNorm.preset,
      thicknessNorm.custom,
      THICKNESS_MAP,
      "1px",
    ),
    lineColor,
    lineAlign: normalized.align ?? "center",
  };
}

export { ALIGN_STYLES };
