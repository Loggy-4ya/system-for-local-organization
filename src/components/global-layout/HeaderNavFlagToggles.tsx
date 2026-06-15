"use client";

/**
 * @fileoverview Shared pill/admin flag toggles for header categories and nav links.
 *
 * @module src/components/global-layout/HeaderNavFlagToggles
 */

import React from "react";
import { RectangleHorizontal, Shield } from "lucide-react";
import { EditorFlagBadge } from "./EditorFlagBadge";
import { siteChromeLucideProps } from "./resolveLucideIcon";
import { type NavItemVariant } from "@shared/constants/globalLayout";

/** Flag fields shared by {@link HeaderCategory} and {@link HeaderNavItem}. */
export interface HeaderNavFlagValues {
  /** Pill-style nav appearance when set to `button`. */
  variant?: NavItemVariant;
  /** Restrict visibility to admin roles. */
  adminOnly?: boolean;
}

/** Props for {@link HeaderNavFlagToggles}. */
export interface HeaderNavFlagTogglesProps {
  /** Current flag values. */
  value: HeaderNavFlagValues;
  /** Partial flag update. */
  onChange: (fields: Partial<HeaderNavFlagValues>) => void;
}

/**
 * Pill button and admin-only toggles used on category and link rows.
 *
 * @param props - See {@link HeaderNavFlagTogglesProps}.
 * @returns Flag toggle button group JSX.
 */
export function HeaderNavFlagToggles({ value, onChange }: HeaderNavFlagTogglesProps) {
  return (
    <>
      <EditorFlagBadge
        label="Pill button"
        icon={<RectangleHorizontal {...siteChromeLucideProps()} aria-hidden />}
        active={value.variant === "button"}
        activeVariant="default"
        onToggle={() =>
          onChange({
            variant: value.variant === "button" ? "link" : "button",
          })
        }
      />
      <EditorFlagBadge
        label="Admin only"
        icon={<Shield {...siteChromeLucideProps()} aria-hidden />}
        active={Boolean(value.adminOnly)}
        activeVariant="destructive"
        onToggle={() =>
          onChange({
            adminOnly: !value.adminOnly,
          })
        }
      />
    </>
  );
}

export default HeaderNavFlagToggles;
