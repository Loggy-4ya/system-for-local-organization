"use client";

/**
 * @fileoverview Puck block for styled Tab strips.
 *
 * Maps to Figma TabGroup components with alignment, size, and accent color overrides.
 *
 * @module src/components/puck/blocks/content/NexusTabs
 */

import React, { useState } from "react";

export const NexusTabs = {
  label: "Tabs Group",
  fields: {
    tabs: {
      type: "array" as const,
      label: "Tabs",
      arrayFields: {
        label: { type: "text" as const, label: "Label" },
      },
    },
    defaultActiveIndex: {
      type: "number" as const,
      label: "Default Active Index",
      min: 0,
    },
    align: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    size: {
      type: "radio" as const,
      label: "Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
      ],
    },
    accentColor: {
      type: "text" as const,
      label: "Accent Color Override (Optional)",
    },
  },
  defaultProps: {
    tabs: [
      { label: "Current" },
      { label: "Sport" },
      { label: "Announcements" },
    ],
    defaultActiveIndex: 0,
    align: "left" as const,
    size: "md" as const,
    accentColor: "",
  },
  render({
    tabs,
    defaultActiveIndex,
    align,
    size,
    accentColor,
  }: {
    tabs: Array<{ label: string }>;
    defaultActiveIndex: number;
    align: "left" | "center" | "right";
    size: "sm" | "md";
    accentColor?: string;
  }) {
    const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

    const sizeStyles = {
      sm: { padding: "6px 10px", fontSize: "11px" },
      md: { padding: "8px 14px", fontSize: "12px" },
    };

    const alignmentStyles = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };

    const activeBg = accentColor || "var(--color-accent-user)";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: alignmentStyles[align] || "flex-start",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            padding: 4,
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {tabs.map((tab, idx) => (
            <span
              key={idx}
              onClick={() => setActiveIndex(idx)}
              style={{
                borderRadius: "var(--radius-md)",
                fontWeight: idx === activeIndex ? 500 : 400,
                background: idx === activeIndex ? activeBg : "transparent",
                color: idx === activeIndex ? "#fff" : "var(--color-text-secondary)",
                cursor: "pointer",
                userSelect: "none",
                transition: "background 0.2s, color 0.2s",
                ...sizeStyles[size],
              }}
            >
              {tab.label}
            </span>
          ))}
        </div>
      </div>
    );
  },
};

export default NexusTabs;
