"use client";

/**
 * @fileoverview Puck block for an Image element.
 *
 * Supports URL entry, file upload, alt text, custom dimensions,
 * alignment, border-radius, and shadow effects.
 *
 * @module src/components/puck/blocks/content/NexusImage
 */

import React from "react";
import { ImageField } from "../../fields/ImageField";

export const NexusImage = {
  label: "Image",
  fields: {
    image: {
      type: "custom" as const,
      label: "Image Source",
      render: ImageField as any,
    },
    alt: {
      type: "text" as const,
      label: "Alt Text",
    },
    width: {
      type: "text" as const,
      label: "Width (e.g. 100%, 400px)",
    },
    height: {
      type: "text" as const,
      label: "Height (e.g. auto, 250px)",
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
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "None", value: "0px" },
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
        { label: "Full (Circle)", value: "50%" },
      ],
    },
    shadowDepth: {
      type: "select" as const,
      label: "Shadow Depth",
      options: [
        { label: "None", value: "none" },
        { label: "Soft", value: "0 4px 12px rgba(0,0,0,0.1)" },
        { label: "Medium", value: "0 8px 24px rgba(0,0,0,0.2)" },
        { label: "Strong", value: "0 8px 24px -4px rgba(0,0,0,0.35)" },
      ],
    },
  },
  defaultProps: {
    image: "",
    alt: "Nexus Image",
    width: "100%",
    height: "auto",
    align: "center" as const,
    borderRadius: "var(--radius-md)" as const,
    shadowDepth: "none" as const,
  },
  render({
    image,
    alt,
    width,
    height,
    align,
    borderRadius,
    shadowDepth,
  }: {
    image: string;
    alt: string;
    width: string;
    height: string;
    align: "left" | "center" | "right";
    borderRadius: string;
    shadowDepth: string;
  }) {
    const alignStyles = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };

    return (
      <div
        style={{
          display: "flex",
          justifyContent: alignStyles[align] || "center",
          width: "100%",
          padding: "var(--spacing-sm) 0",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alt}
            style={{
              width: width || "100%",
              height: height || "auto",
              maxWidth: "100%",
              borderRadius: borderRadius || "0px",
              boxShadow: shadowDepth || "none",
              objectFit: "cover" as const,
            }}
          />
        ) : (
          <div
            style={{
              width: width && width.includes("px") ? width : "320px",
              height: height && height.includes("px") ? height : "180px",
              maxWidth: "100%",
              background: "var(--color-bg-cell)",
              border: "1px dashed var(--color-border-default)",
              borderRadius: borderRadius || "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "28px" }}>🖼️</span>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Empty Image Block
            </span>
          </div>
        )}
      </div>
    );
  },
};

export default NexusImage;
