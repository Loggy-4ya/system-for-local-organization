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
import { LAYOUT_GAP_OPTIONS } from "../../lib/fieldOptionLabels";

export const NexusGrid = {
  label: "Grid Layout",
  fields: {
    columns: {
      type: "select" as const,
      label: "Grid Columns (1-12)",
      options: Array.from({ length: 12 }, (_, i) => ({
        label: `${i + 1} Column${i > 0 ? "s" : ""}`,
        value: String(i + 1),
      })),
    },
    gap: {
      type: "select" as const,
      label: "Gap Size",
      options: [...LAYOUT_GAP_OPTIONS],
    },
    content: {
      type: "slot" as const,
      label: "Grid Items",
      allow: ["NexusGridItem"],
    },
  },
  defaultProps: {
    columns: "12" as const,
    gap: "medium" as const,
  },
  render({
    columns,
    gap,
    content: Content,
  }: {
    columns: string;
    gap: "none" | "small" | "medium" | "large";
    content: React.ComponentType<{ style?: React.CSSProperties }>;
  }) {
    const gapStyles = {
      none: "0px",
      small: "var(--spacing-sm)",
      medium: "var(--spacing-md)",
      large: "var(--spacing-lg)",
    };

    const cols = parseInt(columns, 10) || 12;

    return (
      <div style={{ width: "100%", padding: "var(--spacing-sm) 0" }}>
        <Content
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: gapStyles[gap] || gapStyles.medium,
            width: "100%",
          }}
        />
      </div>
    );
  },
};

export default NexusGrid;
