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
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import {
  SECTION_MAX_WIDTH_OPTIONS,
  SECTION_PADDING_OPTIONS,
} from "../../lib/fieldOptionLabels";
import {
  DEFAULT_CONTENT_WIDTH,
} from "../../lib/contentWidthTokens";
import {
  normalizeSectionPaddingValue,
  resolveSectionMaxWidth,
  resolveSectionPadding,
} from "../../lib/resolveSectionDimensions";
import { normalizePresetDimensionValue, presetValuesFromOptions } from "../../lib/resolvePresetDimension";
import { DISALLOW_NEXUS_GRID_ITEM } from "../../lib/nexusGridItemZonePolicy";

const MAX_WIDTH_PRESET_VALUES = presetValuesFromOptions(SECTION_MAX_WIDTH_OPTIONS);

export const NexusSection = {
  label: "Section Container",
  fields: {
    maxWidth: createPresetDimensionPuckField({
      label: "Max Width",
      options: SECTION_MAX_WIDTH_OPTIONS,
      defaultPreset: DEFAULT_CONTENT_WIDTH,
      defaultCustom: "1200px",
      legacyMap: { contained: "lg", narrow: "sm" },
    }),
    padding: createPresetDimensionPuckField({
      label: "Padding",
      options: SECTION_PADDING_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "var(--spacing-lg) var(--spacing-md)",
      legacyMap: { small: "sm", normal: "md", large: "lg" },
    }),
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
      disallow: [...DISALLOW_NEXUS_GRID_ITEM],
    },
  },
  defaultProps: {
    maxWidth: { preset: DEFAULT_CONTENT_WIDTH, custom: "1200px" },
    padding: { preset: "md", custom: "var(--spacing-lg) var(--spacing-md)" },
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
    puck,
  }: {
    maxWidth: unknown;
    padding: unknown;
    backgroundOverride?: string;
    textColor?: string;
    borderTop: "none" | "thin";
    borderBottom: "none" | "thin";
    content: React.ComponentType<{
      className?: string;
      minEmptyHeight?: number | string;
    }>;
    puck?: { isEditing?: boolean };
  }) {
    const maxWidthNorm = normalizePresetDimensionValue(
      maxWidth,
      undefined,
      MAX_WIDTH_PRESET_VALUES,
      { preset: DEFAULT_CONTENT_WIDTH, custom: "1200px" },
      { contained: "lg", narrow: "sm" },
    );
    const resolvedMaxWidth = resolveSectionMaxWidth(maxWidthNorm, maxWidthNorm.custom);
    const resolvedPadding = resolveSectionPadding(padding);

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
            maxWidth: resolvedMaxWidth,
            width: "100%",
            marginInline: resolvedMaxWidth === "100%" ? "0" : "auto",
            padding: resolvedPadding,
            color: textColor || "inherit",
            boxSizing: "border-box",
          }}
        >
          <Content
            className={puck?.isEditing ? "nexus-section__dropzone" : undefined}
            minEmptyHeight={puck?.isEditing ? 120 : undefined}
          />
        </div>
      </section>
    );
  },
};

export default NexusSection;
