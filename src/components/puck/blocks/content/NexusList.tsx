"use client";

/**
 * @fileoverview Puck block for bulleted or numbered Lists.
 *
 * Renders a list of items with customizable list styles and spacing.
 *
 * @module src/components/puck/blocks/content/NexusList
 */

import React from "react";

export const NexusList = {
  label: "List",
  fields: {
    items: {
      type: "array" as const,
      label: "List Items",
      arrayFields: {
        text: { type: "text" as const, label: "Item Text" },
      },
    },
    listType: {
      type: "radio" as const,
      label: "List Type",
      options: [
        { label: "Bulleted", value: "bullet" },
        { label: "Numbered", value: "number" },
      ],
    },
    spacing: {
      type: "radio" as const,
      label: "Item Spacing",
      options: [
        { label: "Tight", value: "sm" },
        { label: "Normal", value: "md" },
      ],
    },
  },
  defaultProps: {
    items: [
      { text: "First item in the list" },
      { text: "Second item in the list" },
      { text: "Third item in the list" },
    ],
    listType: "bullet" as const,
    spacing: "md" as const,
  },
  render({
    items,
    listType,
    spacing,
  }: {
    items: Array<{ text: string }>;
    listType: "bullet" | "number";
    spacing: "sm" | "md";
  }) {
    const Tag = listType === "number" ? "ol" : "ul";

    const itemGap = spacing === "sm" ? "4px" : "8px";

    return (
      <Tag
        style={{
          margin: 0,
          paddingLeft: "24px",
          textAlign: "left",
          color: "var(--color-text-primary)",
          display: "flex",
          flexDirection: "column",
          gap: itemGap,
          fontSize: "14px",
          lineHeight: 1.5,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {items.map((item, idx) => (
          <li key={idx} style={{ color: "var(--color-text-primary)" }}>
            <span style={{ color: "var(--color-text-primary)" }}>
              {item.text || "List Item"}
            </span>
          </li>
        ))}
      </Tag>
    );
  },
};

export default NexusList;
