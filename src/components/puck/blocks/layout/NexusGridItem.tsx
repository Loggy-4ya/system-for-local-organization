"use client";

/**
 * @fileoverview Puck block for a flexible Grid Item.
 *
 * Renders as an inline grid item with customizable column and row span.
 * The `content` slot rejects nested {@link NexusGridItem} and {@link NexusGrid}
 * blocks so editors cannot stack grids (Grid → GridItem → Grid).
 *
 * @module src/components/puck/blocks/layout/NexusGridItem
 */

import React from "react";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { GRID_SPAN_COL_OPTIONS, GRID_SPAN_ROW_OPTIONS } from "../../lib/fieldOptionLabels";

export const NexusGridItem = {
  label: "Grid Item",
  inline: true,
  fields: {
    spanCol: createSteppedSliderField("Column Span", GRID_SPAN_COL_OPTIONS),
    spanRow: createSteppedSliderField("Row Span", GRID_SPAN_ROW_OPTIONS),
    content: {
      type: "slot" as const,
      label: "Item Content",
      disallow: ["NexusGridItem", "NexusGrid"],
    },
  },
  defaultProps: {
    spanCol: "4" as const,
    spanRow: "1" as const,
  },
  render({
    spanCol,
    spanRow,
    content: Content,
    puck,
  }: {
    spanCol: string;
    spanRow: string;
    content: React.ComponentType<{
      ref?: React.Ref<HTMLElement>;
      className?: string;
      style?: React.CSSProperties;
    }>;
    puck: { dragRef: React.Ref<HTMLElement>; isEditing?: boolean };
  }) {
    return (
      <Content
        ref={puck.dragRef}
        className="nexus-grid-item"
        style={{
          gridColumn: `span ${spanCol}`,
          gridRow: `span ${spanRow}`,
          minWidth: 0,
          width: "100%",
        }}
      />
    );
  },
};

export default NexusGridItem;
