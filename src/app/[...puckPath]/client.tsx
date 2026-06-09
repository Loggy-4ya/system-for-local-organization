"use client";

/**
 * @fileoverview Puck editor + viewer Client Component for Project Nexus.
 *
 * This component is always a Client Component because Puck's drag-and-drop
 * engine requires browser APIs. It renders in one of two modes:
 *
 *  - **Editor mode** (`isEditing === true`): Renders the full `<Puck>` editor
 *    so authorised users can visually build and save page layouts.
 *  - **Viewer mode** (`isEditing === false`): Renders the lightweight
 *    `<Render>` component — safe for ISR / SSR output.
 *
 * Saving is handled by POSTing the Puck data to `/api/puck`.
 *
 * @module src/app/[...puckPath]/client
 */

import { Puck, Render } from "@measured/puck";
import "@measured/puck/puck.css";
import "../puck-editor.css"; // Import custom transparency styles
import puckConfig from "@/components/puck/config";
import { PuckIframeTheme } from "@/components/puck/PuckIframeTheme";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { installSafePointerCapture } from "@/lib/safePointerCapture";
import type { Data } from "@measured/puck";
import Link from "next/link";

installSafePointerCapture();

// ── Props ────────────────────────────────────────────────────────────────────

/** Props accepted by the Puck client component. */
interface PuckClientProps {
  /** Absolute page path (e.g. `"/news"`) used as the MongoDB document key. */
  path: string;
  /**
   * Serialised Puck layout data loaded from MongoDB, or `null` if the page
   * has no content yet (new page; editor will start blank).
   */
  data: Data | null;
  /** When true, renders the full Puck editor. Otherwise renders `<Render>`. */
  isEditing: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Puck Client Component — renders either the editor or the static viewer.
 *
 * @param props - See `PuckClientProps`.
 * @returns JSX for the Puck editor or the Puck render view.
 */
export function PuckClient({ path, data, isEditing }: PuckClientProps) {
  /**
   * Persist the current Puck layout to MongoDB via the `/api/puck` endpoint.
   *
   * @param nextData - The full Puck data object emitted by Puck on save.
   */
  async function handlePublish(nextData: Data) {
    const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
    const res = await fetch("/api/puck", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        // Only send the auth header when the secret is actually configured.
        // Without it the server dev bypass allows the save through.
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        path,
        puckData:  nextData,
        published: true,
      }),
    });

    if (!res.ok) {
      console.error("[PuckClient] Failed to save page:", await res.text());
    }
  }

  if (isEditing) {
    return (
      <Puck
        config={puckConfig}
        data={data ?? { content: [], zones: {} }}
        onPublish={handlePublish}
        overrides={{
          iframe: ({ children, document }) => (
            <PuckIframeTheme document={document}>{children}</PuckIframeTheme>
          ),
          headerActions: ({ children }) => (
            <>
              {/* Current Editing Path */}
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  marginRight: "12px",
                  fontWeight: 500,
                  background: "var(--color-bg-cell)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                Editing: <code style={{ color: "var(--color-accent-user)" }}>{path}</code>
              </span>

              {/* Back to Page Manager */}
              <Link
                href="/pages"
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                  textDecoration: "none",
                  padding: "6px 12px",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 500,
                  marginRight: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>All Pages</span>
              </Link>

              {/* Theme toggle — GlobalHeader is hidden on /edit routes */}
              <span style={{ marginRight: "8px", display: "inline-flex" }}>
                <ThemeToggle />
              </span>

              {/* Default Publish Button */}
              {children}
            </>
          ),
        }}
      />
    );
  }

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        This page has no content yet.
      </div>
    );
  }

  return <Render config={puckConfig} data={data} />;
}

export default PuckClient;
