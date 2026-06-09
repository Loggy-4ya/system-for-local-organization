"use client";

/**
 * @fileoverview Syncs site theme and Nexus design tokens into the Puck preview iframe.
 *
 * Puck 0.20 renders the editable canvas inside an isolated iframe that does not
 * inherit `data-theme` or `globals.css` from the parent document. This override
 * injects semantic CSS variables and sets `data-theme` so block text remains
 * readable against light or dark backgrounds.
 *
 * @module src/components/puck/PuckIframeTheme
 */

import { useTheme } from "@teispace/next-themes";
import { useEffect } from "react";

/** DOM id used for the injected `<style>` element inside the preview iframe. */
const TOKEN_STYLE_ID = "nexus-puck-preview-tokens";

/**
 * Minimal Nexus semantic tokens required by Puck block inline styles.
 * Kept in sync with `src/app/globals.css` dark/light overrides.
 */
const PREVIEW_TOKEN_CSS = `
:root {
  --color-bg-surface: #0f1729;
  --color-bg-elevated: #1e2945;
  --color-bg-panel: #18213a;
  --color-bg-cell: #121a29;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border-default: rgba(71, 85, 105, 0.45);
  --color-warning: #fbbf24;
  --color-danger: #f87171;
  --color-success: #34d399;
  --accent-blue-soft: #93c5fd;
  --accent-blue-medium: #60a5fa;
  --accent-blue-strong: #3b82f6;
  --accent-red-soft: #fca5a5;
  --accent-red-medium: #f87171;
  --accent-red-strong: #ef4444;
  --accent-yellow-soft: #fde68a;
  --accent-yellow-medium: #fbbf24;
  --accent-yellow-strong: #f59e0b;
  --accent-green-soft: #6ee7b7;
  --accent-green-medium: #34d399;
  --accent-green-strong: #10b981;
  --accent-purple-soft: #c4b5fd;
  --accent-purple-medium: #a78bfa;
  --accent-purple-strong: #8b5cf6;
  --color-accent-user: var(--accent-blue-medium);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}
[data-theme="light"] {
  --color-bg-surface: #f8fafc;
  --color-bg-elevated: #ffffff;
  --color-bg-panel: #f1f5f9;
  --color-bg-cell: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-border-default: rgba(148, 163, 184, 0.45);
}
`;

/** Props for the Puck `iframe` override wrapper. */
export interface PuckIframeThemeProps {
  /** Default iframe children rendered by Puck. */
  children: React.ReactNode;
  /** Reference to the preview iframe's `document`, when available. */
  document?: Document;
}

/**
 * Puck `iframe` override — applies theme attribute and token stylesheet.
 *
 * @param props - See `PuckIframeThemeProps`.
 * @returns Fragment wrapping Puck's default iframe children.
 */
export function PuckIframeTheme({ children, document: iframeDoc }: PuckIframeThemeProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!iframeDoc?.documentElement) return;

    const theme = resolvedTheme === "light" ? "light" : "dark";
    iframeDoc.documentElement.setAttribute("data-theme", theme);

    let styleEl = iframeDoc.getElementById(TOKEN_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = iframeDoc.createElement("style");
      styleEl.id = TOKEN_STYLE_ID;
      styleEl.textContent = PREVIEW_TOKEN_CSS;
      iframeDoc.head.appendChild(styleEl);
    }

    if (iframeDoc.body) {
      iframeDoc.body.style.color = "var(--color-text-primary)";
      iframeDoc.body.style.fontFamily = 'var(--font-inter, "Inter", system-ui, sans-serif)';
      iframeDoc.body.style.margin = "0";
    }
  }, [iframeDoc, resolvedTheme]);

  return <>{children}</>;
}

export default PuckIframeTheme;
