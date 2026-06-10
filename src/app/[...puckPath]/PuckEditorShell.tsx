"use client";

/**
 * @fileoverview Client-only Puck editor shell — avoids SSR/hydration mismatches.
 *
 * @module src/app/[...puckPath]/PuckEditorShell
 */

import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import "../puck-editor.css";
import puckConfig from "@/components/puck/config";
import { PuckIframeTheme } from "@/components/puck/PuckIframeTheme";
import { EditorModeToggle } from "@/components/puck/EditorModeToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PagePathHeaderChip } from "@/components/puck/PagePathHeaderChip";
import type { PagePathEditorHandle } from "@/components/puck/PagePathEditor";
import { PageTitleEditor } from "@/components/puck/PageTitleEditor";
import type { Data } from "@measured/puck";
import Link from "next/link";
import { useCallback, useRef } from "react";

/** Props for the client-only Puck editor shell. */
export interface PuckEditorShellProps {
  /** Current MongoDB page path key. */
  path: string;
  /** Fallback title from MongoDB when root props omit one. */
  pageTitle: string;
  /** Controlled Puck document state. */
  editorData: Data;
  /** Sync handler wired to Puck `onChange`. */
  onEditorDataChange: (data: Data) => void;
  /** Called after a successful publish (path may have changed). */
  onPublished: (nextPath: string) => void;
  /** Optional publish error message shown in the header. */
  error: string | null;
  /** Propagate publish errors to the parent shell. */
  onError: (message: string | null) => void;
}

/**
 * Full Puck editor with Nexus header overrides.
 *
 * @param props - See {@link PuckEditorShellProps}.
 * @returns Puck editor JSX.
 */
export function PuckEditorShell({
  path,
  pageTitle,
  editorData,
  onEditorDataChange,
  onPublished,
  error,
  onError,
}: PuckEditorShellProps) {
  const pathEditorRef = useRef<PagePathEditorHandle>(null);

  const handlePublish = useCallback(
    async (nextData: Data) => {
      onError(null);
      const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
      const cleanPath = pathEditorRef.current?.getNormalizedPath() ?? path;

      if (!cleanPath || !cleanPath.startsWith("/")) {
        onError("Path must start with a slash (/)");
        return;
      }

      const title =
        (nextData.root as { props?: { title?: string } })?.props?.title ||
        pageTitle ||
        "Untitled Page";

      const res = await fetch("/api/puck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          previousPath: path,
          path: cleanPath,
          puckData: nextData,
          title,
          published: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Failed to save page.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {
          /* use default */
        }
        onError(errMsg);
        console.error("[PuckEditorShell] Failed to save page:", errText);
        return;
      }

      onPublished(cleanPath);
    },
    [onError, onPublished, pageTitle, path],
  );

  return (
    <Puck
      config={puckConfig}
      data={editorData}
      onChange={onEditorDataChange}
      onPublish={handlePublish}
      overrides={{
        iframe: ({ children, document }) => (
          <PuckIframeTheme document={document}>{children}</PuckIframeTheme>
        ),
        header: ({ children }) => (
          <>
            {children}
            <PageTitleEditor />
          </>
        ),
        headerActions: ({ children }) => (
          <>
            <PagePathHeaderChip ref={pathEditorRef} initialPath={path} />

            {error && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#ef4444",
                  marginRight: "12px",
                  fontWeight: 500,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {error}
              </span>
            )}

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

            <span style={{ marginRight: "8px", display: "inline-flex", gap: "8px" }}>
              <EditorModeToggle />
              <ThemeToggle />
            </span>

            {children}
          </>
        ),
      }}
    />
  );
}

export default PuckEditorShell;
