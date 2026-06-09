"use client";

/**
 * @fileoverview Shared light/dark theme toggle for Project Nexus.
 *
 * Used in `GlobalHeader` and the Puck editor header so theme switching
 * remains available when the global header is hidden on `/edit` routes.
 *
 * @module src/components/ui/ThemeToggle
 */

import { useTheme } from "@teispace/next-themes";
import { useEffect, useState } from "react";

/** Props accepted by `ThemeToggle`. */
export interface ThemeToggleProps {
  /** Optional extra CSS class names for the button element. */
  className?: string;
}

/**
 * Cycles between light and dark themes via `@teispace/next-themes`.
 *
 * Defers icon rendering until after mount to avoid React 19 hydration
 * mismatches on the dynamic `aria-label`.
 *
 * @param props - See `ThemeToggleProps`.
 * @returns The theme toggle button element.
 */
export function ThemeToggle({
  className = "flex items-center gap-[5px] rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-cell)] px-[8px] py-[5px] text-[13px] transition-opacity hover:opacity-80",
}: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /** Toggle between light and dark, ignoring system-only resolution edge cases. */
  function handleThemeToggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      aria-label={
        mounted
          ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`
          : "Toggle theme"
      }
      className={className}
    >
      {mounted ? (
        <>
          <span
            aria-hidden="true"
            className={
              resolvedTheme === "dark"
                ? "text-[var(--color-text-secondary)]"
                : "text-[var(--color-accent-user)]"
            }
          >
            ☀
          </span>
          <span
            aria-hidden="true"
            className={
              resolvedTheme === "dark"
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)]"
            }
          >
            ☾
          </span>
        </>
      ) : (
        <span aria-hidden="true" className="w-8 inline-block" />
      )}
    </button>
  );
}

export default ThemeToggle;
