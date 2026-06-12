"use client";

/**
 * @fileoverview Puck block for a styled Button.
 *
 * Maps to Figma Button variants (Primary, Secondary, Ghost, Success, Danger),
 * with size, full-width, border-radius, and icon selection.
 *
 * @module src/components/puck/blocks/content/NexusButton
 */

import { Button, buttonVariants } from "@/components/ui/button";
import { BUTTON_SIZE_OPTIONS } from "../../lib/fieldOptionLabels";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

/** Puck variant keys mapped to Shadcn button variants. */
const VARIANT_MAP: Record<
  "primary" | "secondary" | "ghost" | "success" | "danger",
  NonNullable<VariantProps<typeof buttonVariants>["variant"]>
> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  success: "success",
  danger: "danger",
};

/** Puck size keys mapped to Shadcn button sizes. */
const SIZE_MAP: Record<"sm" | "md" | "lg", NonNullable<VariantProps<typeof buttonVariants>["size"]>> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

export const NexusButton = {
  label: "Button",
  fields: {
    label: {
      type: "text" as const,
      label: "Label",
    },
    variant: {
      type: "select" as const,
      label: "Variant",
      options: [
        { label: "Primary (Accent)", value: "primary" },
        { label: "Secondary (Elevated)", value: "secondary" },
        { label: "Ghost (Transparent)", value: "ghost" },
        { label: "Success (Green)", value: "success" },
        { label: "Danger (Red)", value: "danger" },
      ],
    },
    size: {
      type: "radio" as const,
      label: "Size",
      options: [...BUTTON_SIZE_OPTIONS],
    },
    fullWidth: {
      type: "radio" as const,
      label: "Full Width",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
        { label: "Full (Pill)", value: "var(--radius-full)" },
      ],
    },
    icon: {
      type: "select" as const,
      label: "Icon (Optional)",
      options: [
        { label: "None", value: "" },
        { label: "Arrow Right (→)", value: "→" },
        { label: "Plus (+)", value: "+" },
        { label: "Checkmark (✓)", value: "✓" },
        { label: "Cross (❌)", value: "❌" },
        { label: "Warning (⚠️)", value: "⚠️" },
        { label: "Star (⭐)", value: "⭐" },
      ],
    },
    iconPosition: {
      type: "radio" as const,
      label: "Icon Position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    href: {
      type: "text" as const,
      label: "Link URL (Optional)",
    },
  },
  defaultProps: {
    label: "Action",
    variant: "primary" as const,
    size: "md" as const,
    fullWidth: "no" as const,
    borderRadius: "var(--radius-md)" as const,
    icon: "",
    iconPosition: "right" as const,
    href: "",
  },
  render({
    label,
    variant,
    size,
    fullWidth,
    borderRadius,
    icon,
    iconPosition,
    href,
  }: {
    label: string;
    variant: "primary" | "secondary" | "ghost" | "success" | "danger";
    size: "sm" | "md" | "lg";
    fullWidth: "no" | "yes";
    borderRadius: string;
    icon?: string;
    iconPosition: "left" | "right";
    href?: string;
  }) {
    const shadcnVariant = VARIANT_MAP[variant];
    const shadcnSize = SIZE_MAP[size];
    const className = cn(
      buttonVariants({ variant: shadcnVariant, size: shadcnSize }),
      fullWidth === "yes" && "w-full",
    );
    const style = { borderRadius: borderRadius || "var(--radius-md)" };

    const content = (
      <>
        {icon && iconPosition === "left" ? <span aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
        {icon && iconPosition === "right" ? <span aria-hidden="true">{icon}</span> : null}
      </>
    );

    if (href) {
      return (
        <a
          href={href}
          className={cn(className, "no-underline")}
          style={style}
        >
          {content}
        </a>
      );
    }

    return (
      <Button type="button" className={className} style={style}>
        {content}
      </Button>
    );
  },
};

export default NexusButton;
