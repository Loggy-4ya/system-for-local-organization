"use client";

/**
 * @fileoverview Shared spacing and island shell field definitions for Puck blocks.
 *
 * @module src/components/puck/lib/spacingFields
 */

import React from "react";
import { IslandFieldGroup } from "../fields/IslandFieldGroup";
import { SpacingFieldGroup } from "../fields/SpacingFieldGroup";
import { resolveNexusColor } from "./nexusColorTokens";

/** Spacing token keys available in select fields. */
export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";

/** Island max-width modes (aligned with header / page shell). */
export type IslandMaxWidth = "contained" | "narrow" | "full";

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
  islandMaxWidth?: IslandMaxWidth;
  islandAlign?: "left" | "center" | "right";
  islandFillPreset?: string;
  islandBorderPreset?: string;
  islandBorderWidth?: "none" | "thin" | "medium";
  islandRadius?: "sm" | "md" | "lg";
  islandPadding?: SpacingToken;
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

const ISLAND_WIDTH_MAP: Record<IslandMaxWidth, string> = {
  contained: "1200px",
  narrow: "800px",
  full: "100%",
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

/** Default island values for new blocks. */
export const ISLAND_DEFAULTS: IslandProps = {
  islandEnabled: false,
  islandMaxWidth: "contained",
  islandAlign: "center",
  islandFillPreset: "glass-panel",
  islandBorderPreset: "border-default",
  islandBorderWidth: "thin",
  islandRadius: "md",
  islandPadding: "md",
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
    islandAlign: island.islandAlign ?? props.islandAlign,
    islandFillPreset: island.islandFillPreset ?? props.islandFillPreset,
    islandBorderPreset: island.islandBorderPreset ?? props.islandBorderPreset,
    islandBorderWidth: island.islandBorderWidth ?? props.islandBorderWidth,
    islandRadius: island.islandRadius ?? props.islandRadius,
    islandPadding: island.islandPadding ?? props.islandPadding,
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
} {
  const flat = flattenBlockShellProps(props);
  const paddingTop = resolveSpacingValue(flat.paddingTop, flat.paddingTopCustom);
  const paddingRight = resolveSpacingValue(flat.paddingRight, flat.paddingRightCustom);
  const paddingBottom = resolveSpacingValue(flat.paddingBottom, flat.paddingBottomCustom);
  const paddingLeft = resolveSpacingValue(flat.paddingLeft, flat.paddingLeftCustom);

  const shellStyle: React.CSSProperties = {
    marginTop: resolveSpacingValue(flat.marginTop, flat.marginTopCustom),
    marginRight: resolveSpacingValue(flat.marginRight, flat.marginRightCustom),
    marginBottom: resolveSpacingValue(flat.marginBottom, flat.marginBottomCustom),
    marginLeft: resolveSpacingValue(flat.marginLeft, flat.marginLeftCustom),
    width: "100%",
    boxSizing: "border-box",
  };

  const contentStyle: React.CSSProperties = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    boxSizing: "border-box",
    width: "100%",
  };

  const islandActive = isIslandActive(flat);
  const islandPadding = resolveSpacingValue(
    (flat.islandPadding ?? flat.liningPadding ?? "md") as SpacingToken,
  );
  const borderWidth = ISLAND_BORDER_WIDTH_MAP[flat.islandBorderWidth ?? "thin"];
  const borderColor = resolveNexusColor(
    flat.islandBorderPreset ?? "border-default",
    "var(--color-border-default)",
  );
  const fill = resolveNexusColor(
    flat.islandFillPreset ?? "glass-panel",
    "color-mix(in srgb, var(--color-bg-panel) 94%, transparent)",
  );
  const radiusKey = flat.islandRadius ?? "md";
  const radius = ISLAND_RADIUS_MAP[radiusKey] ?? ISLAND_RADIUS_MAP.md;
  const maxWidth = ISLAND_WIDTH_MAP[flat.islandMaxWidth ?? "contained"];
  const align = ISLAND_ALIGN_MAP[flat.islandAlign ?? "center"];

  const islandOuterStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: align,
    width: "100%",
    maxWidth,
    marginInline: flat.islandMaxWidth === "full" ? undefined : "auto",
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

  return { shellStyle, contentStyle, islandOuterStyle, islandInnerStyle, islandActive };
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
  fields: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactNode;
  resolveFields?: (
    data: { props: BlockShellProps },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>;
}

/**
 * Wrap a Puck block with spacing + optional island shell fields and render wrapper.
 *
 * @param block - Original block definition.
 * @returns Extended block config.
 */
export function withBlockShell<T extends PuckBlockLike>(block: T): T {
  const originalRender = block.render;
  const originalResolveFields = block.resolveFields;

  return {
    ...block,
    fields: {
      ...block.fields,
      spacing: SPACING_GROUP_FIELD,
      island: ISLAND_GROUP_FIELD,
    },
    defaultProps: {
      ...block.defaultProps,
      spacing: SPACING_DEFAULTS,
      island: ISLAND_DEFAULTS,
    },
    resolveFields: (data, params) => {
      const base = originalResolveFields
        ? originalResolveFields(data, params)
        : params.fields;
      return resolveSpacingFieldVisibility(base, data.props);
    },
    render: (props) => {
      const {
        shellStyle,
        contentStyle,
        islandOuterStyle,
        islandInnerStyle,
        islandActive,
      } = applyBlockShell(props as BlockShellProps);
      const inner = originalRender(props);

      if (!islandActive) {
        return (
          <div style={shellStyle}>
            <div style={contentStyle}>{inner}</div>
          </div>
        );
      }

      return (
        <div style={shellStyle}>
          <div style={islandOuterStyle}>
            <div style={islandInnerStyle}>
              <div style={contentStyle}>{inner}</div>
            </div>
          </div>
        </div>
      );
    },
  };
}
