"use client";

/**
 * @fileoverview Shared spacing and island shell field definitions for Puck blocks.
 *
 * Tests: `tests/puck/lib/blockShellBand.test.ts` — `npm run test:block-shell-band`
 *
 * @module src/components/puck/lib/spacingFields
 */

import React from "react";
import { IslandFieldGroup } from "../fields/IslandFieldGroup";
import { SpacingFieldGroup } from "../fields/SpacingFieldGroup";
import {
  CONTENT_WIDTH_MAP,
  DEFAULT_CONTENT_WIDTH,
  normalizeContentWidth,
  type ContentWidthToken,
  type LegacyContentWidth,
} from "./contentWidthTokens";
import { resolveNexusColor } from "./nexusColorTokens";
import { resolveEffectiveIslandComponents } from "./editorIslandSettings";
import {
  resolveInsertDefaultsProps,
  type PuckResolveDataParams,
} from "./applyIslandDefaultsOnInsert";

/** Spacing token keys available in select fields. */
export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";

/** Island max-width modes (shared content width tokens + custom). */
export type IslandMaxWidth = ContentWidthToken | LegacyContentWidth | "custom";

/** Island border width presets or custom CSS length. */
export type IslandBorderWidthToken = "none" | "thin" | "medium" | "custom";

/** Island corner radius presets or custom CSS length. */
export type IslandRadiusToken = "sm" | "md" | "lg" | "custom";

/** Padding and margin props stored under the `spacing` object field group. */
export interface SpacingProps {
  paddingTop?: SpacingToken;
  paddingTopCustom?: string;
  paddingRight?: SpacingToken;
  paddingRightCustom?: string;
  paddingBottom?: SpacingToken;
  paddingBottomCustom?: string;
  paddingLeft?: SpacingToken;
  paddingLeftCustom?: string;
  marginTop?: SpacingToken;
  marginTopCustom?: string;
  marginRight?: SpacingToken;
  marginRightCustom?: string;
  marginBottom?: SpacingToken;
  marginBottomCustom?: string;
  marginLeft?: SpacingToken;
  marginLeftCustom?: string;
}

/** Island layout props stored under the `island` object field group. */
export interface IslandProps {
  islandEnabled?: boolean;
  /** When true, auto-island healing must not override the user's island choice. */
  islandUserOverride?: boolean;
  islandMaxWidth?: IslandMaxWidth;
  /** CSS max-width when {@link IslandProps.islandMaxWidth} is `custom`. */
  islandMaxWidthCustom?: string;
  islandAlign?: "left" | "center" | "right";
  islandFillPreset?: string;
  islandBorderPreset?: string;
  islandBorderWidth?: IslandBorderWidthToken;
  /** CSS border width when {@link IslandProps.islandBorderWidth} is `custom`. */
  islandBorderWidthCustom?: string;
  islandRadius?: IslandRadiusToken;
  /** CSS border radius when {@link IslandProps.islandRadius} is `custom`. */
  islandRadiusCustom?: string;
  islandPadding?: SpacingToken;
  /** CSS padding when {@link IslandProps.islandPadding} is `custom`. */
  islandPaddingCustom?: string;
}

/** Props added to every block wrapped with {@link withBlockShell}. */
export interface BlockShellProps extends SpacingProps, IslandProps {
  /** Grouped spacing fields in the Puck sidebar. */
  spacing?: SpacingProps;
  /** Grouped island fields in the Puck sidebar. */
  island?: IslandProps;
  /** @deprecated Legacy lining props — mapped to island when present. */
  liningEnabled?: boolean;
  liningColor?: string;
  liningRadius?: string;
  liningPadding?: string;
}

const SPACING_MAP: Record<SpacingToken, string> = {
  none: "0",
  xs: "var(--spacing-xs)",
  sm: "var(--spacing-sm)",
  md: "var(--spacing-md)",
  lg: "var(--spacing-lg)",
  xl: "var(--spacing-xl)",
  "2xl": "var(--spacing-2xl)",
  custom: "0",
};

const ISLAND_ALIGN_MAP = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

const ISLAND_RADIUS_MAP = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
} as const;

const ISLAND_BORDER_WIDTH_MAP = {
  none: "0",
  thin: "1px",
  medium: "2px",
} as const;

/** Default spacing values for new blocks. */
export const SPACING_DEFAULTS: SpacingProps = {
  paddingTop: "none",
  paddingTopCustom: "",
  paddingRight: "none",
  paddingRightCustom: "",
  paddingBottom: "none",
  paddingBottomCustom: "",
  paddingLeft: "none",
  paddingLeftCustom: "",
  marginTop: "none",
  marginTopCustom: "",
  marginRight: "none",
  marginRightCustom: "",
  marginBottom: "none",
  marginBottomCustom: "",
  marginLeft: "none",
  marginLeftCustom: "",
};

/**
 * Default top/bottom margin for blocks on the root page canvas (`sm` → `--spacing-sm`, 8px).
 * To change the default gap site-wide, edit `--spacing-sm` in `src/app/globals.css`.
 */
export const ROOT_BLOCK_VERTICAL_MARGIN: SpacingToken = "sm";

/** @deprecated Alias — use {@link ROOT_BLOCK_VERTICAL_MARGIN}. */
export const ISLAND_VERTICAL_MARGIN: SpacingToken = ROOT_BLOCK_VERTICAL_MARGIN;

/** Spacing applied when island mode is auto-enabled on insert. */
export const ISLAND_AUTO_SPACING_DEFAULTS: SpacingProps = {
  ...SPACING_DEFAULTS,
  marginTop: ROOT_BLOCK_VERTICAL_MARGIN,
  marginBottom: ROOT_BLOCK_VERTICAL_MARGIN,
};

/**
 * Merge island vertical margins into spacing props without losing user overrides.
 *
 * Applies {@link ROOT_BLOCK_VERTICAL_MARGIN} only when top/bottom margin is unset or `none`.
 *
 * @param existing - Current spacing object from block props.
 * @returns Spacing with island defaults on vertical margins.
 */
export function mergeIslandAutoSpacing(existing: SpacingProps = {}): SpacingProps {
  return {
    ...SPACING_DEFAULTS,
    ...existing,
    marginTop:
      !existing.marginTop || existing.marginTop === "none"
        ? ROOT_BLOCK_VERTICAL_MARGIN
        : existing.marginTop,
    marginBottom:
      !existing.marginBottom || existing.marginBottom === "none"
        ? ROOT_BLOCK_VERTICAL_MARGIN
        : existing.marginBottom,
  };
}

/**
 * Merge insert-time vertical margins for a component type.
 *
 * @param _componentType - Puck registry key (reserved for per-type rules).
 * @param existing - Current spacing object from block props.
 * @returns Spacing with root canvas vertical margins when unset.
 */
export function mergeRootInsertSpacing(
  _componentType: string,
  existing: SpacingProps = {},
): SpacingProps {
  return mergeIslandAutoSpacing(existing);
}

/** @deprecated Use {@link ISLAND_AUTO_SPACING_DEFAULTS} — sections now share the same vertical margins. */
export const SECTION_SHELL_SPACING_DEFAULTS: SpacingProps = ISLAND_AUTO_SPACING_DEFAULTS;

/** Default island values for new blocks. */
export const ISLAND_DEFAULTS: IslandProps = {
  islandEnabled: false,
  islandMaxWidth: DEFAULT_CONTENT_WIDTH,
  islandMaxWidthCustom: "1200px",
  islandAlign: "center",
  islandFillPreset: "glass-panel",
  islandBorderPreset: "border-default",
  islandBorderWidth: "thin",
  islandBorderWidthCustom: "1px",
  islandRadius: "md",
  islandRadiusCustom: "var(--radius-md)",
  islandPadding: "md",
  islandPaddingCustom: "16px",
};

/** Compact spacing chapter — custom categorized UI. */
export const SPACING_GROUP_FIELD = {
  type: "custom" as const,
  label: "",
  render: SpacingFieldGroup as never,
};

/** Compact island chapter — custom categorized UI. */
export const ISLAND_GROUP_FIELD = {
  type: "custom" as const,
  label: "",
  render: IslandFieldGroup as never,
};

/**
 * Flatten nested `spacing` / `island` groups for render and legacy flat props.
 *
 * @param props - Raw block props from Puck (nested or flat).
 * @returns Flat shell props for {@link applyBlockShell}.
 */
export function flattenBlockShellProps(props: BlockShellProps): BlockShellProps {
  const spacing = props.spacing ?? {};
  const island = props.island ?? {};

  return {
    ...props,
    paddingTop: spacing.paddingTop ?? props.paddingTop,
    paddingTopCustom: spacing.paddingTopCustom ?? props.paddingTopCustom,
    paddingRight: spacing.paddingRight ?? props.paddingRight,
    paddingRightCustom: spacing.paddingRightCustom ?? props.paddingRightCustom,
    paddingBottom: spacing.paddingBottom ?? props.paddingBottom,
    paddingBottomCustom: spacing.paddingBottomCustom ?? props.paddingBottomCustom,
    paddingLeft: spacing.paddingLeft ?? props.paddingLeft,
    paddingLeftCustom: spacing.paddingLeftCustom ?? props.paddingLeftCustom,
    marginTop: spacing.marginTop ?? props.marginTop,
    marginTopCustom: spacing.marginTopCustom ?? props.marginTopCustom,
    marginRight: spacing.marginRight ?? props.marginRight,
    marginRightCustom: spacing.marginRightCustom ?? props.marginRightCustom,
    marginBottom: spacing.marginBottom ?? props.marginBottom,
    marginBottomCustom: spacing.marginBottomCustom ?? props.marginBottomCustom,
    marginLeft: spacing.marginLeft ?? props.marginLeft,
    marginLeftCustom: spacing.marginLeftCustom ?? props.marginLeftCustom,
    islandEnabled: island.islandEnabled ?? props.islandEnabled,
    islandMaxWidth: island.islandMaxWidth ?? props.islandMaxWidth,
    islandMaxWidthCustom: island.islandMaxWidthCustom ?? props.islandMaxWidthCustom,
    islandAlign: island.islandAlign ?? props.islandAlign,
    islandFillPreset: island.islandFillPreset ?? props.islandFillPreset,
    islandBorderPreset: island.islandBorderPreset ?? props.islandBorderPreset,
    islandBorderWidth: island.islandBorderWidth ?? props.islandBorderWidth,
    islandBorderWidthCustom: island.islandBorderWidthCustom ?? props.islandBorderWidthCustom,
    islandRadius: island.islandRadius ?? props.islandRadius,
    islandRadiusCustom: island.islandRadiusCustom ?? props.islandRadiusCustom,
    islandPadding: island.islandPadding ?? props.islandPadding,
    islandPaddingCustom: island.islandPaddingCustom ?? props.islandPaddingCustom,
  };
}

/**
 * Resolve a spacing token + optional custom override to a CSS length.
 *
 * @param token - Preset token from select field.
 * @param custom - Raw CSS value when token is `custom`.
 * @returns Resolved CSS length string.
 */
export function resolveSpacingValue(
  token: SpacingToken | string | undefined,
  custom?: string,
): string {
  if (!token || token === "none") return "0";
  if (token === "custom") return custom || "0";
  return SPACING_MAP[token as SpacingToken] || "0";
}

/**
 * Resolve island max-width from preset token or custom CSS length.
 *
 * @param raw - Stored width token or legacy value.
 * @param custom - CSS length when token is `custom`.
 * @returns CSS max-width value.
 */
export function resolveIslandMaxWidth(
  raw: IslandMaxWidth | string | undefined,
  custom?: string,
): string {
  if (raw === "custom") return custom || CONTENT_WIDTH_MAP[DEFAULT_CONTENT_WIDTH];
  return CONTENT_WIDTH_MAP[normalizeContentWidth(raw)];
}

/**
 * Resolve island border width from preset or custom CSS length.
 *
 * @param token - Border width preset.
 * @param custom - CSS length when token is `custom`.
 * @returns CSS border width.
 */
export function resolveIslandBorderWidth(
  token: IslandBorderWidthToken | string | undefined,
  custom?: string,
): string {
  if (token === "custom") return custom || "1px";
  return ISLAND_BORDER_WIDTH_MAP[token as keyof typeof ISLAND_BORDER_WIDTH_MAP] ?? "1px";
}

/**
 * Resolve island corner radius from preset or custom CSS length.
 *
 * @param token - Radius preset.
 * @param custom - CSS length when token is `custom`.
 * @returns CSS border radius.
 */
export function resolveIslandRadius(
  token: IslandRadiusToken | string | undefined,
  custom?: string,
): string {
  if (token === "custom") return custom || ISLAND_RADIUS_MAP.md;
  return ISLAND_RADIUS_MAP[token as keyof typeof ISLAND_RADIUS_MAP] ?? ISLAND_RADIUS_MAP.md;
}

/**
 * Normalize stored island width for sidebar select (maps legacy tokens, preserves `custom`).
 *
 * @param raw - Stored island max-width prop.
 * @returns Select value token.
 */
export function normalizeIslandMaxWidthSelect(
  raw: IslandMaxWidth | string | undefined,
): ContentWidthToken | "custom" {
  if (raw === "custom") return "custom";
  return normalizeContentWidth(raw);
}

/**
 * Whether island mode is active (supports legacy `liningEnabled` props).
 *
 * @param props - Block shell props.
 * @returns True when island wrapper should render.
 */
export function isIslandActive(props: BlockShellProps): boolean {
  const flat = flattenBlockShellProps(props);
  return Boolean(flat.islandEnabled ?? flat.liningEnabled);
}

/**
 * Whether a block should use a centered max-width band without island chrome.
 *
 * Island-off blocks still honor {@link IslandProps.islandMaxWidth} so full-width
 * pages can show edge-to-edge background while content stays aligned to lg/xl bands.
 * Set max width to **Full Width** for true bleed.
 *
 * @param props - Block props including island fields.
 * @returns True when the width band wrapper should render.
 */
export function isIslandBandActive(props: BlockShellProps): boolean {
  if (isIslandActive(props)) return false;

  const flat = flattenBlockShellProps(props);
  if (flat.islandMaxWidth === "custom") return true;

  return normalizeContentWidth(flat.islandMaxWidth) !== "full";
}

/**
 * Compute margin shell, content padding, and optional island wrapper styles.
 *
 * @param props - Block props including spacing and island fields.
 * @returns Style objects and island flag for render composition.
 */
export function applyBlockShell(props: BlockShellProps): {
  shellStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
  islandOuterStyle: React.CSSProperties;
  islandInnerStyle: React.CSSProperties;
  islandActive: boolean;
  bandActive: boolean;
} {
  const flat = flattenBlockShellProps(props);
  const paddingTop = resolveSpacingValue(flat.paddingTop, flat.paddingTopCustom);
  const paddingRight = resolveSpacingValue(flat.paddingRight, flat.paddingRightCustom);
  const paddingBottom = resolveSpacingValue(flat.paddingBottom, flat.paddingBottomCustom);
  const paddingLeft = resolveSpacingValue(flat.paddingLeft, flat.paddingLeftCustom);

  const islandActive = isIslandActive(flat);

  const shellStyle: React.CSSProperties = {
    marginTop: resolveSpacingValue(flat.marginTop, flat.marginTopCustom),
    marginRight: resolveSpacingValue(flat.marginRight, flat.marginRightCustom),
    marginBottom: resolveSpacingValue(flat.marginBottom, flat.marginBottomCustom),
    marginLeft: resolveSpacingValue(flat.marginLeft, flat.marginLeftCustom),
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const contentStyle: React.CSSProperties = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  };

  const islandPadding = resolveSpacingValue(
    (flat.islandPadding ?? flat.liningPadding ?? "md") as SpacingToken,
    flat.islandPaddingCustom,
  );
  const borderWidth = resolveIslandBorderWidth(
    flat.islandBorderWidth ?? "thin",
    flat.islandBorderWidthCustom,
  );
  const borderColor = resolveNexusColor(
    flat.islandBorderPreset ?? "border-default",
    "var(--color-border-default)",
  );
  const fill = resolveNexusColor(
    flat.islandFillPreset ?? "glass-panel",
    "color-mix(in srgb, var(--color-bg-panel) 94%, transparent)",
  );
  const radius = resolveIslandRadius(flat.islandRadius ?? "md", flat.islandRadiusCustom);
  const maxWidth = resolveIslandMaxWidth(flat.islandMaxWidth, flat.islandMaxWidthCustom);
  const widthToken = flat.islandMaxWidth === "custom" ? "full" : normalizeContentWidth(flat.islandMaxWidth);
  const marginInline = widthToken === "full" && flat.islandMaxWidth !== "custom" ? "0" : "auto";

  const align = ISLAND_ALIGN_MAP[flat.islandAlign ?? "center"];

  const islandOuterStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: align,
    width: "100%",
    minWidth: 0,
    maxWidth,
    marginInline,
    boxSizing: "border-box",
  };

  const islandInnerStyle: React.CSSProperties = {
    width: "100%",
    background: fill,
    border:
      borderWidth === "0" ? "none" : `${borderWidth} solid ${borderColor}`,
    borderRadius: radius,
    padding: islandPadding,
    boxSizing: "border-box",
    backdropFilter: flat.islandFillPreset?.startsWith("glass") ? "blur(12px)" : undefined,
    WebkitBackdropFilter: flat.islandFillPreset?.startsWith("glass") ? "blur(12px)" : undefined,
  };

  const bandActive = isIslandBandActive(flat);

  return {
    shellStyle,
    contentStyle,
    islandOuterStyle,
    islandInnerStyle,
    islandActive,
    bandActive,
    islandAlign: flat.islandAlign ?? "center",
    islandMaxWidthCss: maxWidth,
  };
}

/**
 * Root shell style when max-width band or island chrome applies.
 *
 * Puck's selection overlay uses `getBoundingClientRect()` on `[data-puck-component]`,
 * which must match the visible band — not a full-width outer wrapper.
 *
 * @param shellStyle - Margin shell from {@link applyBlockShell}.
 * @param maxWidth - Resolved island max-width CSS value.
 * @param align - Horizontal band alignment.
 * @returns Single root box style for band/island blocks.
 */
export function buildWidthConstrainedRootStyle(
  shellStyle: React.CSSProperties,
  maxWidth: React.CSSProperties["maxWidth"],
  align: "left" | "center" | "right",
): React.CSSProperties {
  const base: React.CSSProperties = {
    ...shellStyle,
    maxWidth,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  if (align === "center") {
    return { ...base, marginLeft: "auto", marginRight: "auto" };
  }

  if (align === "right") {
    return { ...base, marginLeft: "auto" };
  }

  return { ...base, marginRight: "auto" };
}

/**
 * Pass-through for block resolveFields chains (custom groups handle their own UI).
 *
 * @param fields - Current resolved field map from Puck.
 * @param _props - Block props (unused — kept for API compatibility).
 * @returns Unmodified field map.
 */
export function resolveSpacingFieldVisibility<T extends Record<string, unknown>>(
  fields: T,
  _props: BlockShellProps,
): T {
  return fields;
}

interface PuckBlockLike {
  label?: string;
  /** When true, Puck renders without a wrapper — shell must not add extra DOM layers. */
  inline?: boolean;
  fields: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactNode;
  resolveFields?: (
    data: { props: BlockShellProps },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>;
  resolveData?: (
    data: { props: BlockShellProps },
    params: PuckResolveDataParams,
  ) => Promise<{ props: BlockShellProps }> | { props: BlockShellProps };
}

/**
 * Wrap a Puck block with spacing + optional island shell fields and render wrapper.
 *
 * **New blocks:** Register via `shellBlock()` in `config.tsx` so root-level drops get
 * default vertical margin (`ROOT_BLOCK_VERTICAL_MARGIN` → `sm` / `--spacing-sm`).
 * Inline blocks (`inline: true`) skip the shell — use only for grid slot items.
 *
 * @param block - Original block definition.
 * @param componentType - Puck registry key used for admin island default lookup.
 * @returns Extended block config.
 */
export function withBlockShell<T extends PuckBlockLike>(block: T, componentType: string): T {
  if (block.inline === true) {
    return block;
  }

  const originalRender = block.render;
  const originalResolveFields = block.resolveFields;
  const originalResolveData = block.resolveData;
  const islandDefaultSpacing = ISLAND_AUTO_SPACING_DEFAULTS;

  return {
    ...block,
    fields: {
      ...block.fields,
      spacing: SPACING_GROUP_FIELD,
      island: ISLAND_GROUP_FIELD,
    },
    defaultProps: {
      ...block.defaultProps,
      spacing: islandDefaultSpacing,
      island: ISLAND_DEFAULTS,
    },
    resolveFields: (data, params) => {
      const base = originalResolveFields
        ? originalResolveFields(data, params)
        : params.fields;
      return resolveSpacingFieldVisibility(base, data.props);
    },
    resolveData: async (data, params) => {
      let props = data.props as BlockShellProps;

      if (originalResolveData) {
        const resolved = await originalResolveData(data, params);
        props = resolved.props as BlockShellProps;
      }

      return {
        props: resolveInsertDefaultsProps(
          componentType,
          props,
          params as PuckResolveDataParams,
          { islandDefaultComponents: resolveEffectiveIslandComponents() },
        ),
      };
    },
    render: (props) => {
      const {
        shellStyle,
        contentStyle,
        islandInnerStyle,
        islandActive,
        bandActive,
        islandAlign,
        islandMaxWidthCss,
      } = applyBlockShell(props as BlockShellProps);
      const inner = originalRender(props);
      const constrainedRoot = buildWidthConstrainedRootStyle(
        shellStyle,
        islandMaxWidthCss,
        islandAlign,
      );

      if (islandActive) {
        return (
          <div style={constrainedRoot}>
            <div style={islandInnerStyle}>
              <div style={contentStyle}>{inner}</div>
            </div>
          </div>
        );
      }

      if (bandActive) {
        return (
          <div style={constrainedRoot}>
            <div style={contentStyle}>{inner}</div>
          </div>
        );
      }

      return (
        <div style={shellStyle}>
          <div style={contentStyle}>{inner}</div>
        </div>
      );
    },
  };
}
