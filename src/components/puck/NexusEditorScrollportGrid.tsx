"use client";

/**
 * @fileoverview Desktop Puck canvas scrollport — full-width InfiniteGrid behind the preview.
 *
 * Portals `InfiniteGrid` into the bordered canvas shell so the pattern fills the visible
 * editor column and stays fixed while the shell scrolls tall page content. Compact editor
 * chrome (≤900px) keeps the iframe-contained grid in `PageRoot` only.
 *
 * @module src/components/puck/NexusEditorScrollportGrid
 */

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@teispace/next-themes";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { resolvePageBackgroundProps } from "@/components/puck/lib/pageRootFieldProps";
import type { PageRootStoredProps } from "@/components/puck/lib/pageRootFieldProps";
import { PUCK_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Media query for desktop editor chrome (inverse of compact breakpoint). */
const DESKTOP_EDITOR_MEDIA = `(min-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH + 1}px)`;

/** Cached mount node for stable `useSyncExternalStore` snapshots. */
let cachedMount: HTMLElement | null = null;
let cachedSnapshot: HTMLElement | null = null;

/**
 * Locate Puck's bordered canvas shell (desktop editor column panel).
 *
 * @returns Mount element for the scrollport grid, or null when unavailable.
 */
function resolveScrollportMount(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  return document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null;
}

/**
 * @returns Cached scrollport mount reference.
 */
function getScrollportMount(): HTMLElement | null {
  const mount = resolveScrollportMount();
  if (mount === cachedMount) {
    return cachedSnapshot;
  }

  cachedMount = mount;
  cachedSnapshot = mount;
  return mount;
}

/**
 * Subscribe to Puck DOM/layout changes that affect the scrollport mount.
 *
 * @param onStoreChange - `useSyncExternalStore` callback.
 * @returns Teardown for observers and media listeners.
 */
function subscribeScrollportMount(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const puckRoot = document.querySelector(".Puck");
  const observer =
    puckRoot &&
    new MutationObserver(() => {
      onStoreChange();
    });

  if (observer && puckRoot) {
    observer.observe(puckRoot, { childList: true, subtree: true });
  }

  const media = window.matchMedia(DESKTOP_EDITOR_MEDIA);
  media.addEventListener("change", onStoreChange);

  return () => {
    observer?.disconnect();
    media.removeEventListener("change", onStoreChange);
  };
}

/**
 * @returns Whether the editor uses desktop chrome (side-by-side panels).
 */
function isDesktopEditorChrome(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_EDITOR_MEDIA).matches;
}

/**
 * Subscribe to desktop vs compact editor breakpoint changes.
 *
 * @param onStoreChange - `useSyncExternalStore` callback.
 * @returns Media-query teardown.
 */
function subscribeDesktopEditorChrome(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia(DESKTOP_EDITOR_MEDIA);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

/**
 * Portals a contained `InfiniteGrid` into the canvas shell on desktop editor routes.
 *
 * @returns Portal JSX, or null when compact chrome, mount missing, or non-grid background.
 */
export function NexusEditorScrollportGrid() {
  const { resolvedTheme } = useTheme();

  const mount = useSyncExternalStore(
    subscribeScrollportMount,
    getScrollportMount,
    () => null,
  );

  const isDesktop = useSyncExternalStore(
    subscribeDesktopEditorChrome,
    isDesktopEditorChrome,
    () => false,
  );

  const rootProps = useNexusPuck(
    (state) => state.appState.data.root?.props as PageRootStoredProps | undefined,
  );

  if (!mount || !isDesktop) {
    return null;
  }

  const backgroundProps = resolvePageBackgroundProps(rootProps ?? {});
  const background = backgroundProps.background ?? "site-default";
  if (background !== "site-default") {
    return null;
  }

  const isStatic = backgroundProps.backgroundGridMotion === "static";

  return createPortal(
    <InfiniteGrid
      key={resolvedTheme ?? "dark"}
      isContained
      isStatic={isStatic}
      scrollportLayer
      wrapperId="nexus-editor-scrollport-grid"
    />,
    mount,
  );
}

export default NexusEditorScrollportGrid;
