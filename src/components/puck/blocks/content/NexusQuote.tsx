"use client";

/**
 * @fileoverview Puck block for styled Blockquotes.
 *
 * Supports quote text, author, and accent border color settings.
 *
 * @module src/components/puck/blocks/content/NexusQuote
 */

import React from "react";

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
  },
  defaultProps: {
    text: "The best way to predict the future is to invent it.",
    author: "Alan Kay",
    borderColor: "",
  },
  render({
    text,
    author,
    borderColor,
  }: {
    text: string;
    author?: string;
    borderColor?: string;
  }) {
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
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "1.0625rem",
            fontStyle: "italic",
            lineHeight: 1.5,
            color: "var(--color-text-primary)",
            marginBottom: author ? "var(--spacing-xs)" : "0px",
          }}
        >
          “{text}”
        </p>
        {author && (
          <cite
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              fontStyle: "normal",
            }}
          >
            — {author}
          </cite>
        )}
      </blockquote>
    );
  },
};

export default NexusQuote;
