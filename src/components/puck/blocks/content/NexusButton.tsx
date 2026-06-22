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
import { sanitizeUserHref } from "@shared/lib/safeHref";
import { resolveLucideIcon } from "@/components/global-layout/resolveLucideIcon";
import { LucideIconPickerField, isAllowedLucideIconValue } from "../../fields/LucideIconPickerField";
import {
  BUTTON_SIZE_OPTIONS,
  RADIUS_EXTENDED_SELECT_OPTIONS,
} from "../../lib/fieldOptionLabels";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import {
  normalizePresetDimensionValue,
  presetValuesFromOptions,
  resolvePresetDimension,
} from "../../lib/resolvePresetDimension";
import { useInterpolatedNexusValue } from "../../lib/nexusPageVariablesContext";

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

const RADIUS_PRESET_VALUES = presetValuesFromOptions(RADIUS_EXTENDED_SELECT_OPTIONS);
const RADIUS_DEFAULTS = { preset: "var(--radius-md)", custom: "var(--radius-md)" };

const BUTTON_ICON_SIZE = {
  sm: 14,
  md: 16,
  lg: 18,
} as const;

/**
 * Render a button adornment — Lucide when whitelisted, legacy emoji fallback otherwise.
 *
 * @param icon - Stored icon value from Puck props.
 * @param size - Button size preset.
 * @returns Icon node or null.
 */
function renderButtonIcon(icon: string | undefined, size: "sm" | "md" | "lg") {
  if (!icon) return null;
  const dim = BUTTON_ICON_SIZE[size] ?? BUTTON_ICON_SIZE.md;
  if (isAllowedLucideIconValue(icon)) {
    return resolveLucideIcon(icon, { size: dim, strokeWidth: 2.25 });
  }
  return <span aria-hidden="true">{icon}</span>;
}

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
    size: createSteppedSliderField("Size", BUTTON_SIZE_OPTIONS),
    fullWidth: {
      type: "radio" as const,
      label: "Full Width",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    borderRadius: createPresetDimensionPuckField({
      label: "Border Radius",
      options: RADIUS_EXTENDED_SELECT_OPTIONS,
      defaultPreset: "var(--radius-md)",
      defaultCustom: "var(--radius-md)",
    }),
    icon: {
      type: "custom" as const,
      label: "Icon (optional)",
      render: LucideIconPickerField as never,
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
    borderRadius: { preset: "var(--radius-md)", custom: "var(--radius-md)" },
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
    borderRadius: unknown;
    icon?: string;
    iconPosition: "left" | "right";
    href?: string;
  }) {
    const resolvedLabel = useInterpolatedNexusValue(label);
    const resolvedHref = useInterpolatedNexusValue(href ?? "");
    const safeHref = sanitizeUserHref(resolvedHref);
    const shadcnVariant = VARIANT_MAP[variant];
    const shadcnSize = SIZE_MAP[size] ?? "default";
    const radiusNorm = normalizePresetDimensionValue(
      borderRadius,
      undefined,
      RADIUS_PRESET_VALUES,
      RADIUS_DEFAULTS,
    );
    const radiusMap = Object.fromEntries(
      RADIUS_EXTENDED_SELECT_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => [
        opt.value,
        opt.value,
      ]),
    );
    const className = cn(
      buttonVariants({ variant: shadcnVariant, size: shadcnSize }),
      fullWidth === "yes" && "w-full",
    );
    const style = {
      borderRadius: resolvePresetDimension(
        radiusNorm.preset,
        radiusNorm.custom,
        radiusMap,
        "var(--radius-md)",
      ),
    };

    const content = (
      <>
        {icon && iconPosition === "left" ? renderButtonIcon(icon, size) : null}
        <span>{resolvedLabel}</span>
        {icon && iconPosition === "right" ? renderButtonIcon(icon, size) : null}
      </>
    );

    if (safeHref) {
      return (
        <a
          href={safeHref}
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
