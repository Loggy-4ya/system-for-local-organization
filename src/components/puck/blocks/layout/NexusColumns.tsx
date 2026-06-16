"use client";

/**
 * @fileoverview Puck block for an asymmetrical 2-Column Split.
 *
 * Provides two independent drag-and-drop slots with custom width ratios,
 * gap, vertical alignment, custom padding, and background color.
 *
 * @module src/components/puck/blocks/layout/NexusColumns
 */

import React from "react";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { LAYOUT_GAP_OPTIONS } from "../../lib/fieldOptionLabels";
import { resolveSpacingDimension } from "../../lib/resolveSpacingDimension";
import { DISALLOW_NEXUS_GRID_ITEM } from "../../lib/nexusGridItemZonePolicy";

const GAP_DEFAULTS = { preset: "md", custom: "16px" };
const PADDING_DEFAULTS = { preset: "none", custom: "0" };

export const NexusColumns = {
  label: "2-Column Split",
  fields: {
    ratio: {
      type: "select" as const,
      label: "Width Ratio",
      options: [
        { label: "50% / 50%", value: "50-50" },
        { label: "60% / 40%", value: "60-40" },
        { label: "40% / 60%", value: "40-60" },
        { label: "70% / 30%", value: "70-30" },
        { label: "30% / 70%", value: "30-70" },
      ],
    },
    gap: createPresetDimensionPuckField({
      label: "Gap Size",
      options: LAYOUT_GAP_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "16px",
      showSpacingHint: true,
    }),
    alignItems: {
      type: "select" as const,
      label: "Vertical Alignment",
      options: [
        { label: "Top", value: "start" },
        { label: "Center", value: "center" },
        { label: "Bottom", value: "end" },
        { label: "Stretch", value: "stretch" },
      ],
    },
    padding: createPresetDimensionPuckField({
      label: "Padding",
      options: LAYOUT_GAP_OPTIONS,
      defaultPreset: "none",
      defaultCustom: "0",
      showSpacingHint: true,
    }),
    backgroundOverride: {
      type: "text" as const,
      label: "Background Color/Gradient (Optional)",
    },
    left: {
      type: "slot" as const,
      label: "Left Column",
      disallow: [...DISALLOW_NEXUS_GRID_ITEM],
    },
    right: {
      type: "slot" as const,
      label: "Right Column",
      disallow: [...DISALLOW_NEXUS_GRID_ITEM],
    },
  },
  defaultProps: {
    ratio: "50-50" as const,
    gap: { preset: "md", custom: "16px" },
    alignItems: "stretch" as const,
    padding: { preset: "none", custom: "0" },
    backgroundOverride: "",
  },
  render({
    ratio,
    gap,
    alignItems,
    padding,
    backgroundOverride,
    left: Left,
    right: Right,
    puck,
  }: {
    ratio: "50-50" | "60-40" | "40-60" | "70-30" | "30-70";
    gap: unknown;
    alignItems: "start" | "center" | "end" | "stretch";
    padding: unknown;
    backgroundOverride?: string;
    left: React.ComponentType<{
      className?: string;
      minEmptyHeight?: number | string;
    }>;
    right: React.ComponentType<{
      className?: string;
      minEmptyHeight?: number | string;
    }>;
    puck?: { isEditing?: boolean };
  }) {
    const ratioStyles = {
      "50-50": "1fr 1fr",
      "60-40": "3fr 2fr",
      "40-60": "2fr 3fr",
      "70-30": "7fr 3fr",
      "30-70": "3fr 7fr",
    };

    const resolvedGap = resolveSpacingDimension(gap, GAP_DEFAULTS);
    const resolvedPadding = resolveSpacingDimension(padding, PADDING_DEFAULTS);

    const columnSlotProps = puck?.isEditing
      ? {
          className: "nexus-columns__dropzone" as const,
          minEmptyHeight: 120 as const,
        }
      : {};

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: ratioStyles[ratio] || ratioStyles["50-50"],
          gap: resolvedGap,
          alignItems: alignItems || "stretch",
          padding: resolvedPadding,
          background: backgroundOverride || "transparent",
          borderRadius: backgroundOverride ? "var(--radius-lg)" : "0",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, width: "100%" }}>
          <Left {...columnSlotProps} />
        </div>
        <div style={{ minWidth: 0, width: "100%" }}>
          <Right {...columnSlotProps} />
        </div>
      </div>
    );
  },
};

export default NexusColumns;
