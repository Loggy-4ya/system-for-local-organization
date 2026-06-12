"use client";

/**
 * @fileoverview Puck block for bulleted or numbered Lists.
 *
 * Renders a list of items with customizable list styles, reorderable items,
 * and vertical positioning presets.
 *
 * @module src/components/puck/blocks/content/NexusList
 */

import { ListItemsField } from "../../fields/ListItemsField";
import { ListPositionField, type ListPositionValue } from "../../fields/ListPositionField";
import { LIST_ITEM_SPACING_OPTIONS } from "../../lib/fieldOptionLabels";

export const NexusList = {
  label: "List",
  fields: {
    items: {
      type: "custom" as const,
      label: "List Items",
      render: ListItemsField as never,
    },
    listType: {
      type: "radio" as const,
      label: "List Type",
      options: [
        { label: "Bulleted", value: "bullet" },
        { label: "Numbered", value: "number" },
      ],
    },
    itemSpacing: {
      type: "radio" as const,
      label: "Item Spacing",
      options: [...LIST_ITEM_SPACING_OPTIONS],
    },
    listPosition: {
      type: "custom" as const,
      label: "Vertical Position",
      render: ListPositionField as never,
    },
  },
  defaultProps: {
    items: [
      { text: "First item in the list" },
      { text: "Second item in the list" },
      { text: "Third item in the list" },
    ],
    listType: "bullet" as const,
    itemSpacing: "md" as const,
    listPosition: {
      marginTop: "none",
      marginBottom: "none",
    } satisfies ListPositionValue,
  },
  render({
    items,
    listType,
    itemSpacing,
  }: {
    items: Array<{ text: string }>;
    listType: "bullet" | "number";
    itemSpacing: "sm" | "md";
  }) {
    const Tag = listType === "number" ? "ol" : "ul";

    const itemGap = itemSpacing === "sm" ? "4px" : "8px";

    return (
      <Tag
        style={{
          margin: 0,
          paddingLeft: "24px",
          textAlign: "left",
          color: "var(--color-text-primary)",
          listStyleType: listType === "number" ? "decimal" : "disc",
          listStylePosition: "outside",
          fontSize: "14px",
          lineHeight: 1.5,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            style={{
              color: "var(--color-text-primary)",
              marginBottom: idx < items.length - 1 ? itemGap : undefined,
            }}
          >
            {item.text || "List Item"}
          </li>
        ))}
      </Tag>
    );
  },
};

export default NexusList;
