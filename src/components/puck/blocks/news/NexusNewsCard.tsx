"use client";

/**
 * @fileoverview Puck block for a rich News Card.
 *
 * Replaces the legacy NexusCard and NexusNewsTile blocks.
 * Supports image upload, title, description, category, read time,
 * border-radius, shadow depth, text alignment, and hover effects.
 *
 * @module src/components/puck/blocks/news/NexusNewsCard
 */

import React from "react";
import { ImageField } from "../../fields/ImageField";

export const NexusNewsCard = {
  label: "News Card",
  fields: {
    image: {
      type: "custom" as const,
      label: "Card Image",
      render: ImageField as any,
    },
    title: {
      type: "text" as const,
      label: "Title",
    },
    description: {
      type: "textarea" as const,
      label: "Description",
    },
    category: {
      type: "text" as const,
      label: "Category",
    },
    readTime: {
      type: "text" as const,
      label: "Read Time",
    },
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
        { label: "Extra Large (16px)", value: "var(--radius-xl)" },
      ],
    },
    shadowDepth: {
      type: "select" as const,
      label: "Shadow Depth",
      options: [
        { label: "None", value: "none" },
        { label: "Soft", value: "0 4px 12px rgba(0,0,0,0.1)" },
        { label: "Medium", value: "0 8px 24px rgba(0,0,0,0.2)" },
        { label: "Strong (Figma)", value: "0 8px 24px -4px rgba(0,0,0,0.35)" },
      ],
    },
    align: {
      type: "radio" as const,
      label: "Text Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    hoverEffect: {
      type: "radio" as const,
      label: "Hover Lift Effect",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    href: {
      type: "text" as const,
      label: "Link URL (Optional)",
    },
  },
  defaultProps: {
    image: "",
    title: "Council budget approved for spring events",
    description: "The student council has finalized and approved the budget allocation for upcoming spring activities, including sports and cultural festivals.",
    category: "Current",
    readTime: "3 min read",
    borderRadius: "var(--radius-lg)" as const,
    shadowDepth: "0 4px 12px rgba(0,0,0,0.1)" as const,
    align: "left" as const,
    hoverEffect: "yes" as const,
    href: "",
  },
  render({
    image,
    title,
    description,
    category,
    readTime,
    borderRadius,
    shadowDepth,
    align,
    hoverEffect,
    href,
  }: {
    image: string;
    title: string;
    description: string;
    category: string;
    readTime: string;
    borderRadius: string;
    shadowDepth: string;
    align: "left" | "center" | "right";
    hoverEffect: "no" | "yes";
    href?: string;
  }) {
    const cardElement = (
      <div
        className={`glass-panel ${hoverEffect === "yes" ? "transition-transform duration-200 hover:-translate-y-1" : ""}`}
        style={{
          borderRadius: borderRadius || "var(--radius-lg)",
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-panel)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "340px",
          margin: "0 auto",
          boxShadow: shadowDepth || "none",
        }}
      >
        {/* Image Header */}
        <div
          style={{
            height: "160px",
            background: "var(--color-bg-elevated)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ fontSize: "24px" }}>📰</span>
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                No Image Selected
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
            textAlign: align || "left",
          }}
        >
          {/* Category & Read Time Row */}
          <div
            style={{
              display: "flex",
              justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "space-between",
              gap: "12px",
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              fontWeight: 500,
            }}
          >
            <span style={{ textTransform: "uppercase", color: "var(--color-accent-user)" }}>
              {category}
            </span>
            <span>{readTime}</span>
          </div>

          {/* Title */}
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--color-text-primary)",
            }}
          >
            {title}
          </h4>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--color-text-secondary)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    );

    if (href) {
      return (
        <a href={href} style={{ textDecoration: "none", display: "block" }}>
          {cardElement}
        </a>
      );
    }

    return cardElement;
  },
};

export default NexusNewsCard;
