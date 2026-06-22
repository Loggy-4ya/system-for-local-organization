"use client";

/**
 * @fileoverview Puck block for styled Blockquotes.
 *
 * @module src/components/puck/blocks/content/NexusQuote
 */

import React from "react";
import { FontFamilyField } from "../../fields/FontFamilyField";
import { FontWeightField } from "../../fields/FontWeightField";
import { resolveBlockTypography, type FontFamilyToken, type FontWeightToken } from "../../lib/nexusTypography";
import { useInterpolatedNexusValue } from "../../lib/nexusPageVariablesContext";

export const NexusQuote = {
  label: "Blockquote",
  fields: {
    text: {
      type: "textarea" as const,
      label: "Quote Text",
    },
    author: {
      type: "text" as const,
      label: "Author / Citation",
    },
    borderColor: {
      type: "text" as const,
      label: "Accent Border Color (Optional)",
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
    text: "The best way to predict the future is to invent it.",
    author: "Alan Kay",
    borderColor: "",
    fontFamily: "serif" as FontFamilyToken,
    fontWeight: "400" as FontWeightToken,
  },
  render({
    text,
    author,
    borderColor,
    fontFamily,
    fontWeight,
  }: {
    text: string;
    author?: string;
    borderColor?: string;
    fontFamily?: FontFamilyToken;
    fontWeight?: FontWeightToken;
  }) {
    const resolvedText = useInterpolatedNexusValue(text);
    const resolvedAuthor = useInterpolatedNexusValue(author ?? "");
    const typography = resolveBlockTypography("NexusQuote", fontFamily, fontWeight, "italic");

    return (
      <blockquote
        style={{
          margin: "var(--spacing-md) 0",
          padding: "var(--spacing-sm) var(--spacing-md)",
          borderLeft: `4px solid ${borderColor || "var(--color-accent-user)"}`,
          background: "var(--color-bg-cell)",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          width: "100%",
          boxSizing: "border-box",
          textAlign: "left",
          fontFamily: typography.fontFamily,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "1.0625rem",
            fontStyle: typography.fontStyle,
            lineHeight: 1.5,
            color: "var(--color-text-primary)",
            fontWeight: typography.fontWeight,
            marginBottom: resolvedAuthor ? "var(--spacing-xs)" : "0px",
          }}
        >
          “{resolvedText}”
        </p>
        {resolvedAuthor ? (
          <cite
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              fontStyle: "normal",
              fontFamily: typography.fontFamily,
            }}
          >
            — {resolvedAuthor}
          </cite>
        ) : null}
      </blockquote>
    );
  },
};

export default NexusQuote;
