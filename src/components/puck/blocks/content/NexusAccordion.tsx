"use client";

/**
 * @fileoverview Puck block for an Accordion.
 *
 * Renders an interactive, collapsible list of panels with custom styling.
 *
 * @module src/components/puck/blocks/content/NexusAccordion
 */

import React, { useState } from "react";

export const NexusAccordion = {
  label: "Accordion",
  fields: {
    items: {
      type: "array" as const,
      label: "Accordion Panels",
      arrayFields: {
        title: { type: "text" as const, label: "Panel Title" },
        content: { type: "textarea" as const, label: "Panel Content" },
      },
    },
    allowMultiple: {
      type: "radio" as const,
      label: "Allow Multiple Open",
      options: [
        { label: "No (Single)", value: "no" },
        { label: "Yes (Multiple)", value: "yes" },
      ],
    },
  },
  defaultProps: {
    items: [
      { title: "How do I join the Student Council?", content: "You can submit an application during the spring or autumn registration window via the Council Apply page." },
      { title: "What is the Star system?", content: "Stars are awarded for completing tasks, organizing events, and achieving academic excellence. They can be redeemed for college rewards." },
    ],
    allowMultiple: "no" as const,
  },
  render({
    items,
    allowMultiple,
  }: {
    items: Array<{ title: string; content: string }>;
    allowMultiple: "no" | "yes";
  }) {
    // Local state to track which panels are expanded
    const [openIndices, setOpenIndices] = useState<number[]>([]);

    function togglePanel(idx: number) {
      if (allowMultiple === "yes") {
        if (openIndices.includes(idx)) {
          setOpenIndices(openIndices.filter((i) => i !== idx));
        } else {
          setOpenIndices([...openIndices, idx]);
        }
      } else {
        if (openIndices.includes(idx)) {
          setOpenIndices([]);
        } else {
          setOpenIndices([idx]);
        }
      }
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
          textAlign: "left",
        }}
      >
        {items.map((item, idx) => {
          const isOpen = openIndices.includes(idx);

          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-panel)",
                overflow: "hidden",
                width: "100%",
              }}
            >
              {/* Header */}
              <div
                onClick={() => togglePanel(idx)}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                  background: isOpen ? "var(--color-bg-elevated)" : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: isOpen ? "var(--color-accent-user)" : "var(--color-text-primary)",
                  }}
                >
                  {item.title || "Untitled Panel"}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▼
                </span>
              </div>

              {/* Content */}
              {isOpen && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid var(--color-border-default)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color: "var(--color-text-secondary)",
                    background: "var(--color-bg-cell)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.content || "No content provided."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  },
};

export default NexusAccordion;
