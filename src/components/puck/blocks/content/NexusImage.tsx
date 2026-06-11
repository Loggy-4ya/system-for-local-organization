"use client";

/**
 * @fileoverview Puck block for an Image element.
 *
 * Supports URL entry, file upload, alt text, custom dimensions,
 * alignment, border-radius, and shadow effects.
 *
 * @module src/components/puck/blocks/content/NexusImage
 */

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MediaUploadField } from "../../fields/MediaUploadField";

export const NexusImage = {
  label: "Image",
  fields: {
    image: {
      type: "custom" as const,
      label: "Image Source",
      render: MediaUploadField as never,
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

    const useAspectFrame = height === "auto" || !height;
    const imageStyle = {
      width: useAspectFrame ? "100%" : width || "100%",
      height: useAspectFrame ? "100%" : height || "auto",
      maxWidth: "100%",
      borderRadius: borderRadius || "0px",
      boxShadow: shadowDepth || "none",
      objectFit: "cover" as const,
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
          useAspectFrame ? (
            <AspectRatio
              ratio={16 / 9}
              className="overflow-hidden bg-muted"
              style={{
                width: width || "100%",
                maxWidth: "100%",
                borderRadius: borderRadius || "0px",
                boxShadow: shadowDepth || "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
            </AspectRatio>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={alt} style={imageStyle} />
          )
        ) : (
          <AspectRatio
            ratio={16 / 9}
            className="flex items-center justify-center border border-dashed border-border bg-muted text-muted-foreground"
            style={{
              width: width || "100%",
              maxWidth: "100%",
              borderRadius: borderRadius || "var(--radius-md)",
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span style={{ fontSize: "28px" }}>🖼️</span>
              <span className="text-[11px] tracking-wide uppercase">Empty Image Block</span>
            </div>
          </AspectRatio>
        )}
      </div>
    );
  },
};

export default NexusImage;
