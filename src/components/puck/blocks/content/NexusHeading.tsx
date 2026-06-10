"use client";

/**
 * @fileoverview Puck block for styled Headings.
 *
 * @module src/components/puck/blocks/content/NexusHeading
 */

import React from "react";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import {
  legacyColorTypeToToken,
  resolveNexusColor,
} from "../../lib/nexusColorTokens";

export const NexusHeading = {
  label: "Heading",
  fields: {
    text: { type: "text" as const, label: "Heading Text" },
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
    colorPreset: {
      type: "custom" as const,
      label: "Text Color",
      presetGroup: "text" as const,
      render: NexusColorPresetField as never,
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
  },
  defaultProps: {
    text: "Heading Title",
    level: "h2" as const,
    align: "left" as const,
    colorPreset: "text-primary",
    fontWeight: "700" as const,
  },
  render({
    text,
    level,
    align,
    colorPreset,
    colorType,
    customColor,
    fontWeight,
  }: {
    text: string;
    level: "h1" | "h2" | "h3" | "h4";
    align: "left" | "center" | "right";
    colorPreset?: string;
    colorType?: string;
    customColor?: string;
    fontWeight: "400" | "500" | "600" | "700";
  }) {
    const Tag = level;
    const token = colorPreset || legacyColorTypeToToken(colorType, customColor);
    const headingSizes = {
      h1: "2rem",
      h2: "1.5rem",
      h3: "1.125rem",
      h4: "0.9375rem",
    };

    return (
      <Tag
        style={{
          margin: 0,
          textAlign: align || "left",
          color: resolveNexusColor(token),
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
