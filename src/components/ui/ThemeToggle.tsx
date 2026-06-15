"use client";

/**
 * @fileoverview Shared light/dark theme toggle for Project Nexus.
 *
 * Animated pill switch used in `GlobalHeader` and the Puck editor header so
 * theme switching remains available when the global header is hidden on `/edit`
 * routes.
 *
 * @module src/components/ui/ThemeToggle
 */

import { useTheme } from "@teispace/next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Visual scale presets for {@link ThemeToggle}. */
export type ThemeToggleVariant = "default" | "sidebar";

/** Props accepted by `ThemeToggle`. */
export interface ThemeToggleProps {
  /** Optional extra CSS class names for the button element. */
  className?: string;
  /** Larger control for mobile sidebar rows; default fits compact header slots. */
  variant?: ThemeToggleVariant;
}

/**
 * Cycles between light and dark themes via `@teispace/next-themes`.
 *
 * Renders an accessible square-rounded switch with a sliding knob and crossfading sun/moon
 * icons. The active icon rides on the knob; the inactive icon shows in the
 * opposite track pocket. Defers theme resolution until after mount to avoid React
 * 19 hydration mismatches on dynamic `aria-checked`.
 *
 * Uses `pointerup` on touch devices because iOS Safari often drops synthesized
 * `click` events on nested decorative markup inside buttons.
 *
 * @param props - See `ThemeToggleProps`.
 * @returns The theme toggle button element.
 */
export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const activatedByTouchRef = useRef(false);
  const iconSize = variant === "sidebar" ? 14 : 11;

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  /** Toggle between light and dark, ignoring system-only resolution edge cases. */
  function handleThemeToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  /**
   * Touch activation — primary path on real phones.
   *
   * @param event - Pointer up on the switch control.
   */
  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "touch") return;
    event.preventDefault();
    activatedByTouchRef.current = true;
    handleThemeToggle();
    window.setTimeout(() => {
      activatedByTouchRef.current = false;
    }, 400);
  }

  /**
   * Mouse / keyboard activation.
   *
   * @param event - Click on the switch control.
   */
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (activatedByTouchRef.current) return;
    event.stopPropagation();
    handleThemeToggle();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      aria-label={
        mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"
      }
      suppressHydrationWarning
      className={className ? `nexus-theme-toggle ${className}` : "nexus-theme-toggle"}
    >
      <span className="nexus-theme-toggle__track" aria-hidden="true" suppressHydrationWarning>
        <span className="nexus-theme-toggle__pocket nexus-theme-toggle__pocket--sun">
          <Sun size={iconSize} strokeWidth={2.25} />
        </span>
        <span className="nexus-theme-toggle__pocket nexus-theme-toggle__pocket--moon">
          <Moon size={iconSize} strokeWidth={2.25} />
        </span>
        <span
          className={
            isDark
              ? "nexus-theme-toggle__knob nexus-theme-toggle__knob--dark"
              : "nexus-theme-toggle__knob nexus-theme-toggle__knob--light"
          }
        >
          {isDark ? (
            <Moon size={iconSize} strokeWidth={2.5} className="nexus-theme-toggle__knob-icon" />
          ) : (
            <Sun size={iconSize} strokeWidth={2.5} className="nexus-theme-toggle__knob-icon" />
          )}
        </span>
      </span>
    </button>
  );
}

export default ThemeToggle;
