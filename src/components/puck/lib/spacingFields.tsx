"use client";

/**
 * @fileoverview Shared spacing and background-lining field definitions for Puck blocks.
 *
 * Provides reusable field schemas, defaults, resolveFields visibility, and a render
 * helper that wraps block output in margin/padding/lining shells.
 *
 * @module src/components/puck/lib/spacingFields
 */

import React from "react";
import { RgbaColorField } from "../fields/RgbaColorField";

/** Spacing token keys available in select fields. */
export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";

/** Props added to every block wrapped with {@link withBlockShell}. */
export interface BlockShellProps {
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
  liningEnabled?: boolean;
  liningColor?: string;
  liningRadius?: string;
  liningPadding?: string;
}

const SPACING_OPTIONS = [
  { label: "None", value: "none" },
  { label: "XS (4px)", value: "xs" },
  { label: "SM (8px)", value: "sm" },
  { label: "MD (16px)", value: "md" },
  { label: "LG (24px)", value: "lg" },
  { label: "XL (32px)", value: "xl" },
  { label: "2XL (48px)", value: "2xl" },
  { label: "Custom", value: "custom" },
];

/** CSS values for spacing tokens. */
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

/** Reusable Puck field definitions for padding and margin. */
export const SPACING_FIELD_DEFS = {
  paddingTop: {
    type: "select" as const,
    label: "Padding Top",
    options: SPACING_OPTIONS,
  },
  paddingTopCustom: {
    type: "text" as const,
    label: "Custom Padding Top",
  },
  paddingRight: {
    type: "select" as const,
    label: "Padding Right",
    options: SPACING_OPTIONS,
  },
  paddingRightCustom: {
    type: "text" as const,
    label: "Custom Padding Right",
  },
  paddingBottom: {
    type: "select" as const,
    label: "Padding Bottom",
    options: SPACING_OPTIONS,
  },
  paddingBottomCustom: {
    type: "text" as const,
    label: "Custom Padding Bottom",
  },
  paddingLeft: {
    type: "select" as const,
    label: "Padding Left",
    options: SPACING_OPTIONS,
  },
  paddingLeftCustom: {
    type: "text" as const,
    label: "Custom Padding Left",
  },
  marginTop: {
    type: "select" as const,
    label: "Margin Top",
    options: SPACING_OPTIONS,
  },
  marginTopCustom: {
    type: "text" as const,
    label: "Custom Margin Top",
  },
  marginRight: {
    type: "select" as const,
    label: "Margin Right",
    options: SPACING_OPTIONS,
  },
  marginRightCustom: {
    type: "text" as const,
    label: "Custom Margin Right",
  },
  marginBottom: {
    type: "select" as const,
    label: "Margin Bottom",
    options: SPACING_OPTIONS,
  },
  marginBottomCustom: {
    type: "text" as const,
    label: "Custom Margin Bottom",
  },
  marginLeft: {
    type: "select" as const,
    label: "Margin Left",
    options: SPACING_OPTIONS,
  },
  marginLeftCustom: {
    type: "text" as const,
    label: "Custom Margin Left",
  },
};

/** Background lining field definitions. */
export const LINING_FIELD_DEFS = {
  liningEnabled: {
    type: "radio" as const,
    label: "Background Lining",
    options: [
      { label: "Off", value: false },
      { label: "On", value: true },
    ],
  },
  liningColor: {
    type: "custom" as const,
    label: "Lining Color",
    render: RgbaColorField as never,
  },
  liningRadius: {
    type: "select" as const,
    label: "Lining Radius",
    options: [
      { label: "None", value: "0" },
      { label: "Small", value: "var(--radius-sm)" },
      { label: "Medium", value: "var(--radius-md)" },
      { label: "Large", value: "var(--radius-lg)" },
    ],
  },
  liningPadding: {
    type: "select" as const,
    label: "Lining Inner Padding",
    options: SPACING_OPTIONS.filter((o) => o.value !== "custom"),
  },
};

/** Safe defaults — no visual change on existing pages. */
export const SPACING_DEFAULTS: BlockShellProps = {
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
  liningEnabled: false,
  liningColor: "rgba(59, 130, 246, 0.12)",
  liningRadius: "var(--radius-md)",
  liningPadding: "md",
};

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
 * Compute wrapper and inner styles from block shell props.
 *
 * @param props - Block props including spacing and lining fields.
 * @param innerStyle - Optional extra styles merged into the inner content wrapper.
 * @returns `shellStyle` (outer margin) and `contentStyle` (padding + lining).
 */
export function applyBlockShell(
  props: BlockShellProps,
  innerStyle: React.CSSProperties = {},
): { shellStyle: React.CSSProperties; contentStyle: React.CSSProperties } {
  const paddingTop = resolveSpacingValue(props.paddingTop, props.paddingTopCustom);
  const paddingRight = resolveSpacingValue(props.paddingRight, props.paddingRightCustom);
  const paddingBottom = resolveSpacingValue(props.paddingBottom, props.paddingBottomCustom);
  const paddingLeft = resolveSpacingValue(props.paddingLeft, props.paddingLeftCustom);

  const shellStyle: React.CSSProperties = {
    marginTop: resolveSpacingValue(props.marginTop, props.marginTopCustom),
    marginRight: resolveSpacingValue(props.marginRight, props.marginRightCustom),
    marginBottom: resolveSpacingValue(props.marginBottom, props.marginBottomCustom),
    marginLeft: resolveSpacingValue(props.marginLeft, props.marginLeftCustom),
    width: "100%",
    boxSizing: "border-box",
  };

  const liningPadding = resolveSpacingValue(props.liningPadding as SpacingToken);

  const contentStyle: React.CSSProperties = {
    ...innerStyle,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    boxSizing: "border-box",
    width: "100%",
  };

  if (props.liningEnabled) {
    contentStyle.background = props.liningColor || "rgba(59, 130, 246, 0.12)";
    contentStyle.borderRadius = props.liningRadius || "var(--radius-md)";
    contentStyle.paddingTop = `calc(${paddingTop} + ${liningPadding})`;
    contentStyle.paddingRight = `calc(${paddingRight} + ${liningPadding})`;
    contentStyle.paddingBottom = `calc(${paddingBottom} + ${liningPadding})`;
    contentStyle.paddingLeft = `calc(${paddingLeft} + ${liningPadding})`;
  }

  return { shellStyle, contentStyle };
}

/** Custom-field keys paired with their parent token field. */
const CUSTOM_FIELD_PAIRS: Array<[keyof BlockShellProps, keyof BlockShellProps]> = [
  ["paddingTopCustom", "paddingTop"],
  ["paddingRightCustom", "paddingRight"],
  ["paddingBottomCustom", "paddingBottom"],
  ["paddingLeftCustom", "paddingLeft"],
  ["marginTopCustom", "marginTop"],
  ["marginRightCustom", "marginRight"],
  ["marginBottomCustom", "marginBottom"],
  ["marginLeftCustom", "marginLeft"],
];

/**
 * Hide custom spacing text fields unless their parent token is `custom`.
 *
 * @param fields - Current resolved field map from Puck.
 * @param props - Block props used for visibility checks.
 * @returns Field map with updated `visible` flags.
 */
export function resolveSpacingFieldVisibility<T extends Record<string, unknown>>(
  fields: T,
  props: BlockShellProps,
): T {
  const next = { ...fields } as T & Record<string, { visible?: boolean }>;

  for (const [customKey, tokenKey] of CUSTOM_FIELD_PAIRS) {
    const field = next[customKey as string];
    if (field && typeof field === "object") {
      (field as { visible?: boolean }).visible = props[tokenKey] === "custom";
    }
  }

  if (next.liningColor) {
    (next.liningColor as { visible?: boolean }).visible = Boolean(props.liningEnabled);
  }
  if (next.liningRadius) {
    (next.liningRadius as { visible?: boolean }).visible = Boolean(props.liningEnabled);
  }
  if (next.liningPadding) {
    (next.liningPadding as { visible?: boolean }).visible = Boolean(props.liningEnabled);
  }

  return next;
}

/** Minimal Puck block shape accepted by {@link withBlockShell}. */
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
 * Wrap a Puck block config with shared spacing/lining fields and render shell.
 *
 * @param block - Original block definition from `src/components/puck/blocks/`.
 * @returns Extended block with shell fields and wrapped render output.
 */
export function withBlockShell<T extends PuckBlockLike>(block: T): T {
  const originalRender = block.render;
  const originalResolveFields = block.resolveFields;

  return {
    ...block,
    fields: {
      ...block.fields,
      ...SPACING_FIELD_DEFS,
      ...LINING_FIELD_DEFS,
    },
    defaultProps: {
      ...block.defaultProps,
      ...SPACING_DEFAULTS,
    },
    resolveFields: (data, params) => {
      const base = originalResolveFields
        ? originalResolveFields(data, params)
        : params.fields;
      return resolveSpacingFieldVisibility(base, data.props);
    },
    render: (props) => {
      const { shellStyle, contentStyle } = applyBlockShell(props as BlockShellProps);
      const inner = originalRender(props);
      return (
        <div style={shellStyle}>
          <div style={contentStyle}>{inner}</div>
        </div>
      );
    },
  };
}
