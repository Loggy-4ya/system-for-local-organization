"use client";

/**
 * @fileoverview Editable page URL path control for the Puck editor header.
 *
 * Maintains a local draft slug while typing; the parent reads the committed
 * value only at publish time via {@link PagePathEditorHandle.getNormalizedPath}.
 *
 * @module src/components/puck/PagePathEditor
 */

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { normalizePagePath } from "@shared/lib/pagePathLogic";

export {
  buildPagePublicHref,
  formatPagePathLabel,
  normalizePagePath,
  pagePathToSlug,
} from "@shared/lib/pagePathLogic";

/** Imperative API exposed to the Puck client for publish-time path reads. */
export interface PagePathEditorHandle {
  /**
   * Return the normalized absolute path from the current draft slug.
   *
   * @returns Path starting with `/` (homepage is always `/`).
   */
  getNormalizedPath: () => string;
}

/** Props for the page path editor control. */
interface PagePathEditorProps {
  /** Initial path loaded from MongoDB. */
  initialPath: string;
}

/**
 * Header slug editor — does not notify the parent on every keystroke.
 *
 * @param props - See {@link PagePathEditorProps}.
 * @param ref - Imperative handle for publish-time path retrieval.
 * @returns Inline path input UI.
 */
export const PagePathEditor = forwardRef<PagePathEditorHandle, PagePathEditorProps>(
  function PagePathEditor({ initialPath }, ref) {
    const isHome = initialPath === "/";
    const [slug, setSlug] = useState(isHome ? "" : initialPath.replace(/^\//, ""));

    useEffect(() => {
      setSlug(isHome ? "" : initialPath.replace(/^\//, ""));
    }, [initialPath, isHome]);

    useImperativeHandle(ref, () => ({
      getNormalizedPath: () => (isHome ? "/" : normalizePagePath(slug)),
    }));

    return (
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
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          userSelect: "none",
        }}
      >
        <span>Editing:</span>
        <span style={{ display: "inline-flex", alignItems: "center", color: "var(--color-accent-user)" }}>
          <span>/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isHome}
            placeholder={isHome ? "" : "page-path"}
            title={isHome ? "The homepage URL cannot be renamed" : "Edit page URL path"}
            style={{
              background: "transparent",
              border: "none",
              color: isHome ? "var(--color-text-secondary)" : "var(--color-accent-user)",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: "bold",
              padding: 0,
              outline: "none",
              width: isHome ? "10px" : `${Math.max(8, slug.length) * 7.5}px`,
              minWidth: "40px",
              maxWidth: "250px",
            }}
          />
        </span>
      </span>
    );
  },
);

export default PagePathEditor;
