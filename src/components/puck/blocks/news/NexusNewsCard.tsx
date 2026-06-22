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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { sanitizeUserHref } from "@shared/lib/safeHref";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import { ImageField } from "../../fields/ImageField";
import { SHADOW_DEPTH_OPTIONS } from "../../lib/fieldOptionLabels";
import { useInterpolatedNexusValue } from "../../lib/nexusPageVariablesContext";

export const NexusNewsCard = {
  label: "News Card",
  fields: {
    image: {
      type: "custom" as const,
      label: "Card Image",
      render: ImageField as never,
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
      options: [...SHADOW_DEPTH_OPTIONS],
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
    description:
      "The student council has finalized and approved the budget allocation for upcoming spring activities, including sports and cultural festivals.",
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
    const resolvedImage = useInterpolatedNexusValue(image);
    const resolvedTitle = useInterpolatedNexusValue(title);
    const resolvedDescription = useInterpolatedNexusValue(description);
    const resolvedCategory = useInterpolatedNexusValue(category);
    const resolvedReadTime = useInterpolatedNexusValue(readTime);
    const resolvedHref = useInterpolatedNexusValue(href ?? "");
    const safeImage = sanitizeMediaUrl(resolvedImage);
    const safeHref = sanitizeUserHref(resolvedHref);
    const cardElement = (
      <Card
        className={cn(
          "glass-panel mx-auto w-full overflow-hidden border-border bg-card py-0 transition-transform duration-200",
          hoverEffect === "yes" && "hover:-translate-y-1",
        )}
        style={{
          borderRadius: borderRadius || "var(--radius-lg)",
          boxShadow: shadowDepth || "none",
        }}
      >
        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-secondary">
          {safeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={safeImage} alt={resolvedTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <span style={{ fontSize: "24px" }}>📰</span>
              <span className="text-[11px] tracking-wide uppercase">No Image Selected</span>
            </div>
          )}
        </div>

        <CardHeader
          className="gap-2 px-4 pt-4 pb-0"
          style={{ textAlign: align || "left" }}
        >
          <div
            className="flex gap-3 text-[11px] font-medium text-muted-foreground"
            style={{
              justifyContent:
                align === "center" ? "center" : align === "right" ? "flex-end" : "space-between",
            }}
          >
            <span className="uppercase text-primary">{resolvedCategory}</span>
            <span>{resolvedReadTime}</span>
          </div>
          <CardTitle className="text-[15px] leading-snug">{resolvedTitle}</CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4" style={{ textAlign: align || "left" }}>
          <CardDescription className="line-clamp-3 text-xs leading-relaxed">
            {resolvedDescription}
          </CardDescription>
        </CardContent>
      </Card>
    );

    if (safeHref) {
      return (
        <a href={safeHref} className="block no-underline">
          {cardElement}
        </a>
      );
    }

    return cardElement;
  },
};

export default NexusNewsCard;
