"use client";

/**
 * @fileoverview Puck block for Body Text.
 *
 * @module src/components/puck/blocks/content/NexusText
 */

import React from "react";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import { TiptapField } from "../../fields/TiptapField";
import {
  legacyColorTypeToToken,
  resolveNexusColor,
} from "../../lib/nexusColorTokens";
import { normalizeRichTextForRender } from "../../lib/richTextContent";

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
    fontSize: {
      type: "select" as const,
      label: "Font Size",
      options: [
        { label: "Small (13px)", value: "0.8125rem" },
        { label: "Normal (15px)", value: "0.9375rem" },
        { label: "Large (18px)", value: "1.125rem" },
      ],
    },
    lineHeight: {
      type: "text" as const,
      label: "Line Height (e.g. 1.5, 1.8)",
    },
  },
  defaultProps: {
    text: "<p>This is a paragraph of body text. You can edit this text inline or in the sidebar.</p>",
    align: "left" as const,
    colorPreset: "text-primary",
    fontSize: "0.9375rem" as const,
    lineHeight: "1.6",
  },
  render({
    text,
    align,
    colorPreset,
    colorType,
    customColor,
    fontSize,
    lineHeight,
  }: {
    text: string;
    align: "left" | "center" | "right" | "justify";
    colorPreset?: string;
    colorType?: string;
    customColor?: string;
    fontSize: string;
    lineHeight?: string;
  }) {
    const token = colorPreset || legacyColorTypeToToken(colorType, customColor);
    const html = normalizeRichTextForRender(text);

    return (
      <div
        className="nexus-rich-text"
        style={{
          margin: 0,
          fontSize: fontSize || "0.9375rem",
          lineHeight: lineHeight || "1.6",
          textAlign: align || "left",
          color: resolveNexusColor(token),
          whiteSpace: "pre-wrap",
          width: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
};

export default NexusText;
