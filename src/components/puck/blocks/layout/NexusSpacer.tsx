"use client";

/**
 * @fileoverview Puck block for a vertical Spacer.
 *
 * Enforces spacing consistency by using design system vertical spacing tokens.
 * Supports optional divider lines with custom styling.
 *
 * @module src/components/puck/blocks/layout/NexusSpacer
 */

import React from "react";

export const NexusSpacer = {
  label: "Vertical Spacer",
  fields: {
    height: {
      type: "select" as const,
      label: "Height",
      options: [
        { label: "XS (4px)", value: "xs" },
        { label: "Small (8px)", value: "sm" },
        { label: "Medium (16px)", value: "md" },
        { label: "Large (24px)", value: "lg" },
        { label: "XL (32px)", value: "xl" },
        { label: "2XL (48px)", value: "2xl" },
      ],
    },
    showLine: {
      type: "radio" as const,
      label: "Show Divider Line",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    lineColor: {
      type: "text" as const,
      label: "Line Color (Optional)",
    },
    lineWidth: {
      type: "select" as const,
      label: "Line Width",
      options: [
        { label: "Full (100%)", value: "100%" },
        { label: "80%", value: "80%" },
        { label: "50%", value: "50%" },
        { label: "30%", value: "30%" },
      ],
    },
  },
  defaultProps: {
    height: "md" as const,
    showLine: "no" as const,
    lineColor: "",
    lineWidth: "100%" as const,
  },
  render({
    height,
    showLine,
    lineColor,
    lineWidth,
  }: {
    height: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    showLine: "no" | "yes";
    lineColor?: string;
    lineWidth: "100%" | "80%" | "50%" | "30%";
  }) {
    const heightStyles = {
      xs: "var(--spacing-xs)",
      sm: "var(--spacing-sm)",
      md: "var(--spacing-md)",
      lg: "var(--spacing-lg)",
      xl: "var(--spacing-xl)",
      "2xl": "var(--spacing-2xl)",
    };

    const h = heightStyles[height] || heightStyles.md;

    return (
      <div
        style={{
          height: h,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showLine === "yes" && (
          <hr
            style={{
              width: lineWidth || "100%",
              border: "none",
              borderTop: `1px solid ${lineColor || "var(--color-border-default)"}`,
              margin: 0,
            }}
          />
        )}
      </div>
    );
  },
};

export default NexusSpacer;
