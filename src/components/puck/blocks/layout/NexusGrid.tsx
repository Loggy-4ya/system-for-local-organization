"use client";

/**
 * @fileoverview Puck block for a flexible CSS Grid.
 *
 * Allows arranging child blocks into a dynamic 1-12 column grid
 * with custom gap sizes.
 *
 * @module src/components/puck/blocks/layout/NexusGrid
 */

import React from "react";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { GRID_COLUMN_OPTIONS, LAYOUT_GAP_OPTIONS } from "../../lib/fieldOptionLabels";
import { resolveSpacingDimension } from "../../lib/resolveSpacingDimension";

const GAP_DEFAULTS = { preset: "md", custom: "16px" };

export const NexusGrid = {
  label: "Grid Layout",
  fields: {
    columns: createSteppedSliderField("Grid Columns", GRID_COLUMN_OPTIONS),
    gap: createPresetDimensionPuckField({
      label: "Gap Size",
      options: LAYOUT_GAP_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "16px",
      showSpacingHint: true,
    }),
    content: {
      type: "slot" as const,
      label: "Grid Items",
      allow: ["NexusGridItem"],
    },
  },
  defaultProps: {
    columns: "12" as const,
    gap: { preset: "md", custom: "16px" },
  },
  render({
    columns,
    gap,
    content: Content,
    puck,
  }: {
    columns: string;
    gap: unknown;
    content: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
      minEmptyHeight?: number | string;
    }>;
    puck?: { isEditing?: boolean };
  }) {
    const cols = parseInt(columns, 10) || 12;
    const resolvedGap = resolveSpacingDimension(gap, GAP_DEFAULTS);

    return (
      <Content
        className="nexus-grid"
        minEmptyHeight={puck?.isEditing ? 120 : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: "min-content",
          alignItems: "start",
          gap: resolvedGap,
          width: "100%",
        }}
      />
    );
  },
};

export default NexusGrid;
