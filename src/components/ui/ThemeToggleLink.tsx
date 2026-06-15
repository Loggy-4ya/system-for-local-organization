"use client";

/**
 * @fileoverview Server-safe theme toggle rendered as a plain link.
 *
 * Used in the global header where iOS Safari may not deliver `click` to
 * `<button>` handlers. Navigating to `/api/theme/toggle` updates the cookie
 * and reloads the page with the new theme.
 *
 * Defers knob/icon visuals until after mount (same pattern as {@link ThemeToggle})
 * so SSR and the first client pass agree before applying the server-resolved theme.
 *
 * @module src/components/ui/ThemeToggleLink
 */

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Props for {@link ThemeToggleLink}. */
export interface ThemeToggleLinkProps {
  /** Whether the active theme is dark (drives knob position after mount). */
  isDark: boolean;
  /** Optional extra CSS class names. */
  className?: string;
}

/**
 * Link-styled pill switch that toggles theme via a server route.
 *
 * @param props - See {@link ThemeToggleLinkProps}.
 * @returns Anchor element styled as the Nexus theme toggle.
 */
export function ThemeToggleLink({ isDark, className }: ThemeToggleLinkProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const knobDark = mounted && isDark;

  return (
    <a
      href="/api/theme/toggle"
      role="switch"
      aria-checked={knobDark}
      aria-label={
        mounted ? `Switch to ${knobDark ? "light" : "dark"} theme` : "Toggle theme"
      }
      suppressHydrationWarning
      className={className ? `nexus-theme-toggle ${className}` : "nexus-theme-toggle"}
    >
      <span className="nexus-theme-toggle__track" aria-hidden="true" suppressHydrationWarning>
        <span className="nexus-theme-toggle__pocket nexus-theme-toggle__pocket--sun">
          <Sun size={11} strokeWidth={2.25} />
        </span>
        <span className="nexus-theme-toggle__pocket nexus-theme-toggle__pocket--moon">
          <Moon size={11} strokeWidth={2.25} />
        </span>
        <span
          className={
            knobDark
              ? "nexus-theme-toggle__knob nexus-theme-toggle__knob--dark"
              : "nexus-theme-toggle__knob nexus-theme-toggle__knob--light"
          }
        >
          {knobDark ? (
            <Moon size={11} strokeWidth={2.5} className="nexus-theme-toggle__knob-icon" />
          ) : (
            <Sun size={11} strokeWidth={2.5} className="nexus-theme-toggle__knob-icon" />
          )}
        </span>
      </span>
    </a>
  );
}

export default ThemeToggleLink;
