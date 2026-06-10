"use client";

/**
 * @fileoverview Inline editable page title for the Puck editor header.
 *
 * @module src/components/puck/PageTitleEditor
 */

import { usePuck } from "@measured/puck";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Inline title editor rendered inside the Puck header title slot.
 *
 * @returns Portal-mounted editable title or null until the host node exists.
 */
export function PageTitleEditor() {
  const { appState, dispatch } = usePuck();
  const title =
    (appState.data.root as { props?: { title?: string } })?.props?.title ?? "Untitled Page";

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  useLayoutEffect(() => {
    const el = document.querySelector('[class*="PuckHeader-title"]') as HTMLElement | null;
    if (!el) return;

    el.querySelector("h2, [class*='Heading']")?.remove();
    setHost(el);
  }, []);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  const commit = useCallback(() => {
    const nextTitle = draft.trim() || "Untitled Page";
    const data = appState.data;
    dispatch({
      type: "setData",
      data: {
        ...data,
        root: {
          ...data.root,
          props: {
            ...(data.root as { props?: Record<string, unknown> })?.props,
            title: nextTitle,
          },
        },
      },
    });
    setEditing(false);
  }, [appState.data, dispatch, draft]);

  if (!host) return null;

  return createPortal(
    editing ? (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        style={{
          background: "var(--puck-color-grey-11)",
          border: "1px solid var(--puck-color-grey-09)",
          borderRadius: 4,
          color: "var(--puck-color-black)",
          fontSize: 14,
          fontWeight: 600,
          padding: "2px 6px",
          minWidth: 120,
          maxWidth: 280,
        }}
        aria-label="Page title"
      />
    ) : (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to edit page title"
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "text",
          font: "inherit",
          fontWeight: 600,
          padding: 0,
          textAlign: "left",
        }}
      >
        {title}
      </button>
    ),
    host,
  );
}

export default PageTitleEditor;
