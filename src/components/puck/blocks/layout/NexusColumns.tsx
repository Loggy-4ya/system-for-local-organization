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
import { LAYOUT_GAP_OPTIONS } from "../../lib/fieldOptionLabels";

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
    gap: {
      type: "select" as const,
      label: "Gap Size",
      options: [...LAYOUT_GAP_OPTIONS],
    },
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
    padding: {
      type: "select" as const,
      label: "Padding",
      options: [...LAYOUT_GAP_OPTIONS],
    },
    backgroundOverride: {
      type: "text" as const,
      label: "Background Color/Gradient (Optional)",
    },
    left: {
      type: "slot" as const,
      label: "Left Column",
    },
    right: {
      type: "slot" as const,
      label: "Right Column",
    },
  },
  defaultProps: {
    ratio: "50-50" as const,
    gap: "medium" as const,
    alignItems: "stretch" as const,
    padding: "none" as const,
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
  }: {
    ratio: "50-50" | "60-40" | "40-60" | "70-30" | "30-70";
    gap: "none" | "small" | "medium" | "large";
    alignItems: "start" | "center" | "end" | "stretch";
    padding: "none" | "small" | "medium" | "large";
    backgroundOverride?: string;
    left: React.ComponentType;
    right: React.ComponentType;
  }) {
    const ratioStyles = {
      "50-50": "1fr 1fr",
      "60-40": "3fr 2fr",
      "40-60": "2fr 3fr",
      "70-30": "7fr 3fr",
      "30-70": "3fr 7fr",
    };

    const gapStyles = {
      none: "0px",
      small: "var(--spacing-sm)",
      medium: "var(--spacing-md)",
      large: "var(--spacing-lg)",
    };

    const paddingStyles = {
      none: "0",
      small: "var(--spacing-sm)",
      medium: "var(--spacing-md)",
      large: "var(--spacing-lg)",
    };

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: ratioStyles[ratio] || ratioStyles["50-50"],
          gap: gapStyles[gap] || gapStyles.medium,
          alignItems: alignItems || "stretch",
          padding: paddingStyles[padding] || "0",
          background: backgroundOverride || "transparent",
          borderRadius: backgroundOverride ? "var(--radius-lg)" : "0",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, width: "100%" }}>
          <Left />
        </div>
        <div style={{ minWidth: 0, width: "100%" }}>
          <Right />
        </div>
      </div>
    );
  },
};

export default NexusColumns;
