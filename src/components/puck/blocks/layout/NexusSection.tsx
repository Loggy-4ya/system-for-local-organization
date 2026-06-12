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
import {
  contentWidthContainerStyle,
  CONTENT_WIDTH_OPTIONS,
  DEFAULT_CONTENT_WIDTH,
  type ContentWidthToken,
  type LegacyContentWidth,
} from "../../lib/contentWidthTokens";
import { SECTION_PADDING_OPTIONS } from "../../lib/fieldOptionLabels";

export const NexusSection = {
  label: "Section Container",
  fields: {
    maxWidth: {
      type: "select" as const,
      label: "Max Width",
      options: CONTENT_WIDTH_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
    padding: {
      type: "select" as const,
      label: "Padding",
      options: [...SECTION_PADDING_OPTIONS],
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
    maxWidth: DEFAULT_CONTENT_WIDTH,
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
    maxWidth: ContentWidthToken | LegacyContentWidth;
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

    const widthStyle = contentWidthContainerStyle(maxWidth);

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
            ...widthStyle,
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
