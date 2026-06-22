"use client";

/**
 * @fileoverview Puck block for styled Headings.
 *
 * @module src/components/puck/blocks/content/NexusHeading
 */

import React from "react";
import { FontFamilyField } from "../../fields/FontFamilyField";
import { FontWeightField } from "../../fields/FontWeightField";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import {
  legacyColorTypeToToken,
  resolveNexusColor,
} from "../../lib/nexusColorTokens";
import { useInterpolatedNexusValue } from "../../lib/nexusPageVariablesContext";
import { resolveBlockTypography, type FontFamilyToken, type FontWeightToken } from "../../lib/nexusTypography";

export const NexusHeading = {
  label: "Heading",
  fields: {
    text: { type: "text" as const, label: "Heading Text", description: "Use ${{ title }} and other page variables." },
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
    fontFamily: {
      type: "custom" as const,
      label: "Font Family",
      render: FontFamilyField as never,
    },
    fontWeight: {
      type: "custom" as const,
      label: "Font Weight",
      render: FontWeightField as never,
    },
  },
  defaultProps: {
    text: "Heading Title",
    level: "h2" as const,
    align: "left" as const,
    colorPreset: "text-primary",
    fontFamily: "sans" as FontFamilyToken,
    fontWeight: "700" as FontWeightToken,
  },
  render({
    text,
    level,
    align,
    colorPreset,
    colorType,
    customColor,
    fontFamily,
    fontWeight,
  }: {
    text: string;
    level: "h1" | "h2" | "h3" | "h4";
    align: "left" | "center" | "right";
    colorPreset?: string;
    colorType?: string;
    customColor?: string;
    fontFamily?: FontFamilyToken;
    fontWeight?: FontWeightToken;
  }) {
    const resolvedText = useInterpolatedNexusValue(text);
    const Tag = level;
    const token = colorPreset || legacyColorTypeToToken(colorType, customColor);
    const typography = resolveBlockTypography("NexusHeading", fontFamily, fontWeight);
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
          fontFamily: typography.fontFamily,
          fontWeight: typography.fontWeight,
          fontStyle: typography.fontStyle,
          letterSpacing: level === "h1" || level === "h2" ? "-0.01em" : "normal",
          width: "100%",
        }}
      >
        {resolvedText}
      </Tag>
    );
  },
};

export default NexusHeading;
