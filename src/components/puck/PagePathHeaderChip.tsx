"use client";

/**
 * @fileoverview Page URL slug chip in the Puck header actions (right side).
 *
 * Styled as a compact pill — click to edit. Publish reads via ref handle.
 *
 * @module src/components/puck/PagePathHeaderChip
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { normalizePagePath, type PagePathEditorHandle } from "./PagePathEditor";

/** Props for the header path chip. */
interface PagePathHeaderChipProps {
  /** Initial path loaded from MongoDB. */
  initialPath: string;
}

/**
 * Right-aligned URL slug chip with click-to-edit behavior.
 *
 * @param props - See {@link PagePathHeaderChipProps}.
 * @param ref - Imperative handle for publish-time path retrieval.
 * @returns Header chip UI.
 */
export const PagePathHeaderChip = forwardRef<PagePathEditorHandle, PagePathHeaderChipProps>(
  function PagePathHeaderChip({ initialPath }, ref) {
    const isHome = initialPath === "/";
    const [editing, setEditing] = useState(false);
    const [slug, setSlug] = useState(isHome ? "" : initialPath.replace(/^\//, ""));

    useEffect(() => {
      setSlug(isHome ? "" : initialPath.replace(/^\//, ""));
    }, [initialPath, isHome]);

    useImperativeHandle(ref, () => ({
      getNormalizedPath: () => (isHome ? "/" : normalizePagePath(slug)),
    }));

    if (isHome) return null;

    return (
      <span className="nexus-path-chip" title="Click to edit page URL">
        <span className="nexus-path-chip__label">URL</span>
        {editing ? (
          <span className="nexus-path-chip__value">
            <span className="nexus-path-chip__slash">/</span>
            <input
              autoFocus
              className="nexus-path-chip__input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditing(false);
                if (e.key === "Escape") {
                  setSlug(initialPath.replace(/^\//, ""));
                  setEditing(false);
                }
              }}
              aria-label="Page URL path"
            />
          </span>
        ) : (
          <button
            type="button"
            className="nexus-path-chip__value nexus-path-chip__button"
            onClick={() => setEditing(true)}
          >
            /{slug.replace(/^\/+/, "") || "page-path"}
          </button>
        )}
      </span>
    );
  },
);

export default PagePathHeaderChip;
