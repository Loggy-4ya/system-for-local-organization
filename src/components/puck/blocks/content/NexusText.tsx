"use client";

/**
 * @fileoverview Puck block for Body Text.
 *
 * @module src/components/puck/blocks/content/NexusText
 */

import React from "react";
import { FontFamilyField } from "../../fields/FontFamilyField";
import { FontWeightField } from "../../fields/FontWeightField";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import { TiptapField } from "../../fields/TiptapField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { FONT_SIZE_OPTIONS, LINE_HEIGHT_OPTIONS } from "../../lib/fieldOptionLabels";
import {
  legacyColorTypeToToken,
  resolveNexusColor,
} from "../../lib/nexusColorTokens";
import { resolveBlockTypography, type FontFamilyToken, type FontWeightToken } from "../../lib/nexusTypography";
import { normalizeRichTextForRender } from "../../lib/richTextContent";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  resolvePresetDimension,
} from "../../lib/resolvePresetDimension";

const FONT_SIZE_PRESET_VALUES = presetValuesFromOptions(FONT_SIZE_OPTIONS);
const LINE_HEIGHT_PRESET_VALUES = presetValuesFromOptions(LINE_HEIGHT_OPTIONS);
const FONT_SIZE_DEFAULTS = { preset: "0.9375rem", custom: "0.9375rem" };
const LINE_HEIGHT_DEFAULTS = { preset: "1.6", custom: "1.6" };

export const NexusText = {
  label: "Body Text",
  fields: {
    text: {
      type: "custom" as const,
      label: "Text Content",
      render: TiptapField as never,
    },
    align: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Justify", value: "justify" },
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
    fontSize: createPresetDimensionPuckField({
      label: "Font Size",
      options: FONT_SIZE_OPTIONS,
      defaultPreset: "0.9375rem",
      defaultCustom: "0.9375rem",
    }),
    lineHeight: createPresetDimensionPuckField({
      label: "Line Height",
      options: LINE_HEIGHT_OPTIONS,
      defaultPreset: "1.6",
      defaultCustom: "1.6",
      customMode: "text",
      customPlaceholder: "e.g. 1.5, 1.8",
    }),
  },
  defaultProps: {
    text: "<p>This is a paragraph of body text. You can edit this text inline or in the sidebar.</p>",
    align: "left" as const,
    colorPreset: "text-primary",
    fontFamily: "sans" as FontFamilyToken,
    fontWeight: "400" as FontWeightToken,
    fontSize: { preset: "0.9375rem", custom: "0.9375rem" },
    lineHeight: { preset: "1.6", custom: "1.6" },
  },
  render({
    text,
    align,
    colorPreset,
    colorType,
    customColor,
    fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
  }: {
    text: string;
    align: "left" | "center" | "right" | "justify";
    colorPreset?: string;
    colorType?: string;
    customColor?: string;
    fontFamily?: FontFamilyToken;
    fontWeight?: FontWeightToken;
    fontSize: unknown;
    lineHeight?: unknown;
  }) {
    const token = colorPreset || legacyColorTypeToToken(colorType, customColor);
    const html = normalizeRichTextForRender(text);
    const typography = resolveBlockTypography("NexusText", fontFamily, fontWeight);

    const fontSizeNorm = normalizePresetDimensionValue(
      fontSize,
      undefined,
      FONT_SIZE_PRESET_VALUES,
      FONT_SIZE_DEFAULTS,
    );
    const lineHeightNorm = normalizePresetDimensionValue(
      lineHeight,
      undefined,
      LINE_HEIGHT_PRESET_VALUES,
      LINE_HEIGHT_DEFAULTS,
    );
    const fontSizeMap = Object.fromEntries(
      FONT_SIZE_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
    );
    const lineHeightMap = Object.fromEntries(
      LINE_HEIGHT_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [opt.value, opt.value]),
    );

    return (
      <div
        className="nexus-rich-text"
        style={{
          margin: 0,
          fontSize: resolvePresetDimension(
            fontSizeNorm.preset,
            fontSizeNorm.custom,
            fontSizeMap,
            "0.9375rem",
          ),
          lineHeight: resolvePresetDimension(
            lineHeightNorm.preset,
            lineHeightNorm.custom,
            lineHeightMap,
            "1.6",
          ),
          textAlign: align || "left",
          color: resolveNexusColor(token),
          fontFamily: typography.fontFamily,
          fontWeight: typography.fontWeight,
          fontStyle: typography.fontStyle,
          whiteSpace: "pre-wrap",
          width: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
};

export default NexusText;
