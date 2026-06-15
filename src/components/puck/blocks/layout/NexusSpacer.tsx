"use client";

/**
 * @fileoverview Unified Puck block for vertical spacing and horizontal divider lines.
 *
 * Replaces the former `NexusSpacer` + content Divider pair. Users pick a bundled
 * {@link SeparatorStylePreset} or switch to `custom` for full size/line controls.
 *
 * Tests: tests/puck/lib/separatorBlockLogic.test.ts
 *
 * @module src/components/puck/blocks/layout/NexusSpacer
 */

import React from "react";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import {
  DIVIDER_WIDTH_OPTIONS,
  LAYOUT_GAP_OPTIONS,
  THICKNESS_OPTIONS,
} from "../../lib/fieldOptionLabels";
import {
  ALIGN_STYLES,
  applySeparatorStylePreset,
  inferSeparatorStylePreset,
  normalizeSeparatorProps,
  resolveSeparatorRenderModel,
  SEPARATOR_DEFAULT_PROPS,
  SEPARATOR_STYLE_PRESET_OPTIONS,
  type SeparatorBlockProps,
  type SeparatorStylePreset,
} from "../../lib/separatorBlockLogic";
import type { SpacingCustomUnit } from "../../lib/spacingCustomValue";

const PERCENT_UNITS: SpacingCustomUnit[] = ["px", "rem", "em", "%"];

/** Shared field definitions for spacer/divider blocks. */
const SEPARATOR_FIELDS = {
  stylePreset: {
    type: "select" as const,
    label: "Style Preset",
    options: SEPARATOR_STYLE_PRESET_OPTIONS.map((opt) => ({
      label: opt.label,
      value: opt.value,
    })),
  },
  height: createPresetDimensionPuckField({
    label: "Height",
    options: LAYOUT_GAP_OPTIONS.filter((opt) => opt.value !== "none"),
    defaultPreset: "md",
    defaultCustom: "16px",
    showSpacingHint: true,
  }),
  showLine: {
    type: "radio" as const,
    label: "Show Divider Line",
    options: [
      { label: "No", value: "no" },
      { label: "Yes", value: "yes" },
    ],
  },
  thickness: createPresetDimensionPuckField({
    label: "Line Thickness",
    options: THICKNESS_OPTIONS,
    defaultPreset: "1px",
    defaultCustom: "1px",
  }),
  borderColorPreset: {
    type: "custom" as const,
    label: "Line Color",
    presetGroup: "island-border" as const,
    render: NexusColorPresetField as never,
  },
  width: createPresetDimensionPuckField({
    label: "Line Width",
    options: DIVIDER_WIDTH_OPTIONS,
    defaultPreset: "100%",
    defaultCustom: "100%",
    units: PERCENT_UNITS,
  }),
  align: {
    type: "radio" as const,
    label: "Line Alignment",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
};

/**
 * Render the unified separator container and optional horizontal rule.
 *
 * @param props - Flat separator block props.
 * @returns Separator markup.
 */
function renderSeparator(props: SeparatorBlockProps): React.ReactElement {
  const model = resolveSeparatorRenderModel(props);

  return (
    <div
      style={{
        height: model.containerHeight,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: ALIGN_STYLES[model.lineAlign] || "center",
      }}
    >
      {model.showLine ? (
        <hr
          style={{
            width: model.lineWidth,
            border: "none",
            borderTop: `${model.lineThickness} solid ${model.lineColor}`,
            margin: 0,
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Sync bundled preset fields when the preset selector changes.
 *
 * @param data - Puck resolveData payload.
 * @returns Updated props.
 */
function resolveSeparatorData(
  data: { props: Record<string, unknown> },
): { props: Record<string, unknown> } {
  const flat = data.props as SeparatorBlockProps;
  const previousPreset = flat.stylePreset;
  const normalized = normalizeSeparatorProps(flat);
  const nextPreset = normalized.stylePreset as SeparatorStylePreset | undefined;

  if (
    nextPreset &&
    nextPreset !== "custom" &&
    nextPreset !== previousPreset
  ) {
    return {
      props: {
        ...flat,
        stylePreset: nextPreset,
        ...applySeparatorStylePreset(nextPreset),
      },
    };
  }

  if (!flat.stylePreset) {
    const inferred = inferSeparatorStylePreset(flat);
    return {
      props: {
        ...flat,
        ...normalizeSeparatorProps({ ...flat, stylePreset: inferred }),
      },
    };
  }

  return { props: { ...flat, ...normalized } };
}

/** Layout block for vertical spacing and optional horizontal divider lines. */
export const NexusSpacer = {
  label: "Spacer & Divider",
  fields: SEPARATOR_FIELDS,
  defaultProps: SEPARATOR_DEFAULT_PROPS,
  resolveData: (data: { props: Record<string, unknown> }) => resolveSeparatorData(data),
  render: (props: SeparatorBlockProps) => renderSeparator(props),
};

export default NexusSpacer;
