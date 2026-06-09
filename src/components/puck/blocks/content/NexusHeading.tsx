"use client";

/**
 * @fileoverview Puck block for styled Headings.
 *
 * Supports h1, h2, h3, and h4 levels styled according to the design system,
 * with alignment, color type, custom color, margins, and font-weight.
 *
 * @module src/components/puck/blocks/content/NexusHeading
 */

import React from "react";

export const NexusHeading = {
  label: "Heading",
  fields: {
    text: {
      type: "text" as const,
      label: "Heading Text",
    },
    level: {
      type: "radio" as const,
      label: "Heading Level",
      options: [
        { label: "H1", value: "h1" },
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
        { label: "H4", value: "h4" },
      ],
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
    colorType: {
      type: "select" as const,
      label: "Color Type",
      options: [
        { label: "Primary Text (Default)", value: "primary" },
        { label: "Secondary Text", value: "secondary" },
        { label: "User Accent Color", value: "accent" },
        { label: "Custom HEX/RGB", value: "custom" },
      ],
    },
    customColor: {
      type: "text" as const,
      label: "Custom Color (HEX/RGB)",
    },
    fontWeight: {
      type: "select" as const,
      label: "Font Weight",
      options: [
        { label: "Normal (400)", value: "400" },
        { label: "Medium (500)", value: "500" },
        { label: "Semibold (600)", value: "600" },
        { label: "Bold (700)", value: "700" },
      ],
    },
    marginTop: {
      type: "text" as const,
      label: "Margin Top (e.g. 16px, var(--spacing-md))",
    },
    marginBottom: {
      type: "text" as const,
      label: "Margin Bottom (e.g. 16px, var(--spacing-md))",
    },
  },
  defaultProps: {
    text: "Heading Title",
    level: "h2" as const,
    align: "left" as const,
    colorType: "primary" as const,
    customColor: "",
    fontWeight: "700" as const,
    marginTop: "0px",
    marginBottom: "var(--spacing-sm)",
  },
  render({
    text,
    level,
    align,
    colorType,
    customColor,
    fontWeight,
    marginTop,
    marginBottom,
  }: {
    text: string;
    level: "h1" | "h2" | "h3" | "h4";
    align: "left" | "center" | "right";
    colorType: "primary" | "secondary" | "accent" | "custom";
    customColor?: string;
    fontWeight: "400" | "500" | "600" | "700";
    marginTop?: string;
    marginBottom?: string;
  }) {
    const Tag = level;

    const headingSizes = {
      h1: "2rem",
      h2: "1.5rem",
      h3: "1.125rem",
      h4: "0.9375rem",
    };

    const colors = {
      primary: "var(--color-text-primary)",
      secondary: "var(--color-text-secondary)",
      accent: "var(--color-accent-user)",
      custom: customColor || "var(--color-text-primary)",
    };

    return (
      <Tag
        style={{
          margin: 0,
          marginTop: marginTop || "0px",
          marginBottom: marginBottom || "0px",
          textAlign: align || "left",
          color: colors[colorType] || colors.primary,
          fontSize: headingSizes[level] || headingSizes.h2,
          fontWeight: parseInt(fontWeight, 10) || 700,
          letterSpacing: level === "h1" || level === "h2" ? "-0.01em" : "normal",
          width: "100%",
        }}
      >
        {text}
      </Tag>
    );
  },
};

export default NexusHeading;
