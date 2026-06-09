"use client";

/**
 * @fileoverview Puck block for a contained Page Section.
 *
 * Wraps content in a configurable shell (contained, narrow, full-width)
 * with extensive layout, border, and background settings.
 *
 * @module src/components/puck/blocks/layout/NexusSection
 */

import React from "react";

export const NexusSection = {
  label: "Section Container",
  fields: {
    maxWidth: {
      type: "select" as const,
      label: "Max Width",
      options: [
        { label: "Contained (1200px)", value: "contained" },
        { label: "Narrow (800px)", value: "narrow" },
        { label: "Full Width (100%)", value: "full" },
      ],
    },
    padding: {
      type: "select" as const,
      label: "Padding",
      options: [
        { label: "None", value: "none" },
        { label: "Small", value: "small" },
        { label: "Normal", value: "normal" },
        { label: "Large", value: "large" },
      ],
    },
    backgroundOverride: {
      type: "text" as const,
      label: "Background Color/Gradient (Optional)",
    },
    textColor: {
      type: "text" as const,
      label: "Text Color (Optional)",
    },
    borderTop: {
      type: "radio" as const,
      label: "Border Top",
      options: [
        { label: "None", value: "none" },
        { label: "Thin Line", value: "thin" },
      ],
    },
    borderBottom: {
      type: "radio" as const,
      label: "Border Bottom",
      options: [
        { label: "None", value: "none" },
        { label: "Thin Line", value: "thin" },
      ],
    },
    content: {
      type: "slot" as const,
      label: "Section Content",
    },
  },
  defaultProps: {
    maxWidth: "contained" as const,
    padding: "normal" as const,
    backgroundOverride: "",
    textColor: "",
    borderTop: "none" as const,
    borderBottom: "none" as const,
  },
  render({
    maxWidth,
    padding,
    backgroundOverride,
    textColor,
    borderTop,
    borderBottom,
    content: Content,
  }: {
    maxWidth: "contained" | "narrow" | "full";
    padding: "none" | "small" | "normal" | "large";
    backgroundOverride?: string;
    textColor?: string;
    borderTop: "none" | "thin";
    borderBottom: "none" | "thin";
    content: React.ComponentType;
  }) {
    const paddingStyles = {
      none: "0",
      small: "var(--spacing-sm) var(--spacing-md)",
      normal: "var(--spacing-lg) var(--spacing-md)",
      large: "var(--spacing-2xl) var(--spacing-md)",
    };

    const widthStyles = {
      contained: "1200px",
      narrow: "800px",
      full: "100%",
    };

    const borderStyle = "1px solid var(--color-border-default)";

    return (
      <section
        style={{
          width: "100%",
          background: backgroundOverride || "transparent",
          borderTop: borderTop === "thin" ? borderStyle : "none",
          borderBottom: borderBottom === "thin" ? borderStyle : "none",
        }}
      >
        <div
          style={{
            maxWidth: widthStyles[maxWidth] || "1200px",
            width: "100%",
            margin: "0 auto",
            padding: paddingStyles[padding] || paddingStyles.normal,
            color: textColor || "inherit",
            boxSizing: "border-box",
          }}
        >
          <Content />
        </div>
      </section>
    );
  },
};

export default NexusSection;
