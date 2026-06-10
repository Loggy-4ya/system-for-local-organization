"use client";

/**
 * @fileoverview Puck editor + viewer Client Component for Project Nexus.
 *
 * @module src/app/[...puckPath]/client
 */

import { Puck, Render } from "@measured/puck";
import "@measured/puck/puck.css";
import "../puck-editor.css";
import puckConfig from "@/components/puck/config";
import { PuckIframeTheme } from "@/components/puck/PuckIframeTheme";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PagePathEditor, type PagePathEditorHandle } from "@/components/puck/PagePathEditor";
import { PageTitleEditor } from "@/components/puck/PageTitleEditor";
import { installSafePointerCapture } from "@/lib/safePointerCapture";
import type { Data } from "@measured/puck";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

installSafePointerCapture();

/** Props accepted by the Puck client component. */
interface PuckClientProps {
  /** Absolute page path (e.g. `"/news"`) used as the MongoDB document key. */
  path: string;
  /** Serialised Puck layout data loaded from MongoDB, or `null` for new pages. */
  data: Data | null;
  /** Human-readable page title from MongoDB. */
  pageTitle: string;
  /** When true, renders the full Puck editor. Otherwise renders `<Render>`. */
  isEditing: boolean;
}

/**
 * Merge server root title into Puck data once at editor init.
 *
 * @param data - Loaded Puck payload.
 * @param title - MongoDB page title fallback.
 * @returns Initial editor data object.
 */
function buildEditorData(data: Data | null, title: string): Data {
  return {
    ...(data ?? { content: [], zones: {} }),
    root: {
      ...(data?.root ?? {}),
      props: {
        ...(data?.root as { props?: Record<string, unknown> })?.props,
        title:
          (data?.root as { props?: { title?: string } })?.props?.title ??
          title ??
          "Untitled Page",
      },
    },
  };
}

/**
 * Puck Client Component — renders either the editor or the static viewer.
 *
 * @param props - See {@link PuckClientProps}.
 * @returns JSX for the Puck editor or the Puck render view.
 */
export function PuckClient({ path, data, pageTitle, isEditing }: PuckClientProps) {
  const router = useRouter();
  const pathEditorRef = useRef<PagePathEditorHandle>(null);
  const [editorData, setEditorData] = useState<Data>(() => buildEditorData(data, pageTitle));
  const [error, setError] = useState<string | null>(null);

  /**
   * Persist the current Puck layout to MongoDB via the `/api/puck` endpoint.
   *
   * @param nextData - The full Puck data object emitted by Puck on publish.
   */
  const handlePublish = useCallback(
    async (nextData: Data) => {
      setError(null);
      const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
      const cleanPath = pathEditorRef.current?.getNormalizedPath() ?? path;

      if (!cleanPath || !cleanPath.startsWith("/")) {
        setError("Path must start with a slash (/)");
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
        setError(errMsg);
        console.error("[PuckClient] Failed to save page:", errText);
        return;
      }

      if (cleanPath !== path) {
        router.replace(`${cleanPath}/edit`);
      } else {
        router.refresh();
      }
    },
    [path, pageTitle, router],
  );

  if (isEditing) {
    return (
      <Puck
        config={puckConfig}
        data={editorData}
        onChange={setEditorData}
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

              <PagePathEditor ref={pathEditorRef} initialPath={path} />

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

              <span style={{ marginRight: "8px", display: "inline-flex" }}>
                <ThemeToggle />
              </span>

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
