"use client";

/**
 * @fileoverview Undo/redo toolbar — header chips on desktop, bottom-left canvas island on compact.
 *
 * Mirrors viewport preset island styling/animation on compact chrome. Only one canvas
 * toolbar island may be expanded at a time (see {@link canvasToolbarIslandLogic}).
 *
 * @module src/components/puck/NexusHistoryToolbar
 */

import { Redo2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  collapseViewportToolbarIsland,
  isViewportToolbarExpanded,
  notifyCanvasToolbarOpen,
  subscribeCanvasToolbarOpen,
} from "@/components/puck/lib/canvasToolbarIslandLogic";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import {
  matchesCompactEditorViewport,
  PUCK_COMPACT_EDITOR_MQ,
  usePuckMobileEditorChrome,
} from "@/components/puck/usePuckMobileEditorChrome";

/** Shared icon sizing for history controls. */
const HISTORY_ICON_PROPS = { size: 16, strokeWidth: 2 } as const;

/** Props for a single history icon button. */
interface HistoryIconButtonProps {
  /** Accessible label / tooltip. */
  title: string;
  /** Whether the action is unavailable. */
  disabled: boolean;
  /** Click handler. */
  onClick: () => void;
  /** Icon node. */
  children: React.ReactNode;
  /** Optional extra class names. */
  className?: string;
}

/**
 * Square history control matching header IconButton sizing.
 *
 * @param props - See {@link HistoryIconButtonProps}.
 * @returns Button element.
 */
function HistoryIconButton({
  title,
  disabled,
  onClick,
  children,
  className = "nexus-history-toolbar__btn nexus-editor-header-btn",
}: HistoryIconButtonProps) {
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Desktop / wide header undo + redo chip pair (left of the Puck toolbar cluster).
 *
 * @returns Header history controls.
 */
export function NexusHistoryHeaderToolbar() {
  const hasPast = useNexusPuck((state) => state.history.hasPast);
  const hasFuture = useNexusPuck((state) => state.history.hasFuture);
  const back = useNexusPuck((state) => state.history.back);
  const forward = useNexusPuck((state) => state.history.forward);

  return (
    <div className="nexus-history-toolbar nexus-history-toolbar--header">
      <HistoryIconButton title="Undo" disabled={!hasPast} onClick={back}>
        <Undo2 {...HISTORY_ICON_PROPS} aria-hidden />
      </HistoryIconButton>
      <HistoryIconButton title="Redo" disabled={!hasFuture} onClick={forward}>
        <Redo2 {...HISTORY_ICON_PROPS} aria-hidden />
      </HistoryIconButton>
    </div>
  );
}

/** Cached canvas controls mount for stable snapshots. */
let cachedCanvasControlsMount: HTMLElement | null = null;

/**
 * Locate the full-screen canvas controls mount for portaled islands.
 *
 * @returns Canvas controls element or null.
 */
function getCanvasControlsMount(): HTMLElement | null {
  if (typeof document === "undefined" || !matchesCompactEditorViewport()) {
    cachedCanvasControlsMount = null;
    return null;
  }

  const mount = document.querySelector(
    '.Puck [class*="PuckCanvas--fullScreen"] [class*="PuckCanvas-controls"]',
  ) as HTMLElement | null;

  if (mount === cachedCanvasControlsMount) {
    return cachedCanvasControlsMount;
  }

  cachedCanvasControlsMount = mount;
  return mount;
}

/**
 * Subscribe to DOM / breakpoint changes affecting the canvas controls mount.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Teardown function.
 */
function subscribeCanvasControlsMount(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  const media = window.matchMedia(PUCK_COMPACT_EDITOR_MQ);
  media.addEventListener("change", onStoreChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onStoreChange);
  };
}

/**
 * Compact canvas bottom-left history island — collapsed FAB expands into undo/redo pill.
 *
 * @returns Portaled island or null.
 */
export function NexusHistoryCanvasIsland() {
  const hasPast = useNexusPuck((state) => state.history.hasPast);
  const hasFuture = useNexusPuck((state) => state.history.hasFuture);
  const back = useNexusPuck((state) => state.history.back);
  const forward = useNexusPuck((state) => state.history.forward);
  const [expanded, setExpanded] = useState(false);

  const controlsMount = useSyncExternalStore(
    subscribeCanvasControlsMount,
    getCanvasControlsMount,
    () => null,
  );

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const onToggle = useCallback(() => {
    setExpanded((current) => {
      const next = !current;
      if (next) {
        notifyCanvasToolbarOpen("history");
        collapseViewportToolbarIsland();
      }
      return next;
    });
  }, []);

  useEffect(
    () =>
      subscribeCanvasToolbarOpen((id) => {
        if (id === "viewport") {
          collapse();
        }
      }),
    [collapse],
  );

  useEffect(() => {
    const onViewportToggleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[class*="ViewportControls-toggleButton_"]')) return;

      window.requestAnimationFrame(() => {
        if (isViewportToolbarExpanded()) {
          notifyCanvasToolbarOpen("viewport");
          collapse();
        }
      });
    };

    document.addEventListener("click", onViewportToggleClick, true);
    return () => document.removeEventListener("click", onViewportToggleClick, true);
  }, [collapse]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (isViewportToolbarExpanded()) {
        collapse();
      }
    });

    const viewportRoot = document.querySelector('[class*="ViewportControls--fullScreen"]');
    if (viewportRoot) {
      observer.observe(viewportRoot, { attributes: true, attributeFilter: ["class"] });
    }

    return () => observer.disconnect();
  }, [collapse]);

  if (!controlsMount) return null;

  return createPortal(
    <div
      className={
        expanded
          ? "nexus-canvas-island nexus-history-island nexus-history-island--expanded"
          : "nexus-canvas-island nexus-history-island"
      }
    >
      {expanded ? (
        <div className="nexus-history-island__actions" role="group" aria-label="History">
          <HistoryIconButton
            title="Undo"
            disabled={!hasPast}
            onClick={back}
            className="nexus-history-island__action nexus-history-toolbar__btn nexus-editor-header-btn"
          >
            <Undo2 {...HISTORY_ICON_PROPS} aria-hidden />
          </HistoryIconButton>
          <HistoryIconButton
            title="Redo"
            disabled={!hasFuture}
            onClick={forward}
            className="nexus-history-island__action nexus-history-toolbar__btn nexus-editor-header-btn"
          >
            <Redo2 {...HISTORY_ICON_PROPS} aria-hidden />
          </HistoryIconButton>
        </div>
      ) : null}
      <button
        type="button"
        className="nexus-history-island__toggle nexus-history-toolbar__btn nexus-editor-header-btn"
        aria-label={expanded ? "Close history" : "History"}
        aria-expanded={expanded}
        title={expanded ? "Close history" : "History"}
        onClick={onToggle}
      >
        {expanded ? (
          <X {...HISTORY_ICON_PROPS} aria-hidden />
        ) : (
          <Undo2 {...HISTORY_ICON_PROPS} aria-hidden />
        )}
      </button>
    </div>,
    controlsMount,
  );
}

/**
 * Route undo/redo to header chips (desktop) or the bottom-left canvas island (compact).
 *
 * @returns History toolbar JSX.
 */
export function NexusHistoryToolbar() {
  const isCompactEditor = usePuckMobileEditorChrome();

  if (isCompactEditor) {
    return <NexusHistoryCanvasIsland />;
  }

  return <NexusHistoryHeaderToolbar />;
}

export default NexusHistoryToolbar;
