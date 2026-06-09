"use client";

/**
 * @fileoverview Puck block for a flexible Grid Item.
 *
 * Renders as an inline grid item with customizable column and row span.
 *
 * @module src/components/puck/blocks/layout/NexusGridItem
 */

import React from "react";

export const NexusGridItem = {
  label: "Grid Item",
  inline: true,
  fields: {
    spanCol: {
      type: "select" as const,
      label: "Column Span (1-12)",
      options: Array.from({ length: 12 }, (_, i) => ({
        label: `Span ${i + 1}`,
        value: String(i + 1),
      })),
    },
    spanRow: {
      type: "select" as const,
      label: "Row Span",
      options: Array.from({ length: 6 }, (_, i) => ({
        label: `Span ${i + 1}`,
        value: String(i + 1),
      })),
    },
    content: {
      type: "slot" as const,
      label: "Item Content",
      disallow: ["NexusGridItem"],
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
    content: React.ComponentType;
    puck: { dragRef: React.Ref<any> };
  }) {
    return (
      <div
        ref={puck.dragRef}
        style={{
          gridColumn: `span ${spanCol}`,
          gridRow: `span ${spanRow}`,
          minWidth: 0,
          width: "100%",
        }}
      >
        <Content />
      </div>
    );
  },
};

export default NexusGridItem;
