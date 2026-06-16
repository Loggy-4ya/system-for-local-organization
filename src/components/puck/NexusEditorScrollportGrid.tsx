"use client";

/**
 * @fileoverview Puck canvas scrollport — InfiniteGrid behind the preview.
 *
 * Desktop: grid portals into the bordered canvas shell. Compact (≤900px touch): grid portals
 * into `PuckLayout-inner` as a fixed backdrop above the bottom nav; panel/canvas uncover it.
 *
 * @module src/components/puck/NexusEditorScrollportGrid
 */

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@teispace/next-themes";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { resolvePageBackgroundProps } from "@/components/puck/lib/pageRootFieldProps";
import type { PageRootStoredProps } from "@/components/puck/lib/pageRootFieldProps";
import {
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import { useRequiresIframeContainedEditGrid } from "@/components/puck/lib/previewIframeShellComposite";
import { shouldSuppressShellScrollportGridForIframeContainedEdit } from "@/components/puck/lib/previewIframeGridBacking";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import {
  applyMobileScrollportGridViewport,
  isMobileScrollportGridMetricsLocked,
  notifyMobileScrollportGridResync,
  PUCK_COMPACT_LAYOUT_NAV_SELECTOR,
  resolveMobileScrollportBackdropHost,
  syncCompactNavRailHeight,
  usesMobileScrollportGridBackdropMount,
} from "@/components/puck/lib/mobileScrollportGridFreeze";
import {
  PUCK_COMPACT_EDITOR_MAX_WIDTH,
  PUCK_COMPACT_EDITOR_MQ,
  PUCK_DESKTOP_EDITOR_MQ,
} from "@/components/puck/usePuckMobileEditorChrome";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";

/**
 * Tag backdrop scrollport grid; resync bitmap only when panel layout is stable.
 */
function syncScrollportGridShell(): void {
  applyMobileScrollportGridViewport();
  syncCompactNavRailHeight();
  if (isMobileScrollportGridMetricsLocked()) return;
  notifyMobileScrollportGridResync();
}

/** Media queries that change which element hosts the scrollport grid. */
const DESKTOP_EDITOR_MEDIA = PUCK_DESKTOP_EDITOR_MQ;
const COMPACT_EDITOR_MEDIA = PUCK_COMPACT_EDITOR_MQ;

/** Cached mount node for stable `useSyncExternalStore` snapshots. */
let cachedMount: HTMLElement | null = null;
let cachedSnapshot: HTMLElement | null = null;

/**
 * Locate the scrollport mount — layout-inner backdrop (compact) or canvas shell (desktop).
 *
 * @returns Mount element for the scrollport grid, or null when unavailable.
 */
function resolveScrollportMount(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  if (usesMobileScrollportGridBackdropMount()) {
    return resolveMobileScrollportBackdropHost();
  }

  return (
    (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null)
  );
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

  const desktopMedia = window.matchMedia(DESKTOP_EDITOR_MEDIA);
  const compactMedia = window.matchMedia(COMPACT_EDITOR_MEDIA);
  const narrowMedia = window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`);
  desktopMedia.addEventListener("change", onStoreChange);
  compactMedia.addEventListener("change", onStoreChange);
  narrowMedia.addEventListener("change", onStoreChange);
  window.addEventListener("resize", onStoreChange);

  return () => {
    observer?.disconnect();
    desktopMedia.removeEventListener("change", onStoreChange);
    compactMedia.removeEventListener("change", onStoreChange);
    narrowMedia.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

/**
 * Portals a contained `InfiniteGrid` into the Puck scrollport mount on editor routes.
 *
 * @returns Portal JSX, or null when mount missing or non-grid background.
 */
export function NexusEditorScrollportGrid() {
  const { resolvedTheme } = useTheme();
  const requiresIframeContainedEditGrid = useRequiresIframeContainedEditGrid();
  const mount = useSyncExternalStore(
    subscribeScrollportMount,
    getScrollportMount,
    () => null,
  );

  const rootProps = useNexusPuck(
    (state) => state.appState.data.root?.props as PageRootStoredProps | undefined,
  );

  useEffect(() => {
    if (!mount || typeof ResizeObserver === "undefined") return;

    syncScrollportGridShell();

    const usesBackdrop = usesMobileScrollportGridBackdropMount();

    const shellObserver = new ResizeObserver(() => {
      if (usesBackdrop) return;
      syncScrollportGridShell();
    });
    shellObserver.observe(mount);

    const navRail = document.querySelector(PUCK_COMPACT_LAYOUT_NAV_SELECTOR);
    const navObserver =
      usesBackdrop && navRail
        ? new ResizeObserver(() => {
            syncCompactNavRailHeight();
          })
        : null;
    if (navObserver && navRail) {
      navObserver.observe(navRail);
    }

    const onViewportResize = () => syncScrollportGridShell();
    window.addEventListener("resize", onViewportResize);

    const onSettled = () => syncScrollportGridShell();
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onSettled);

    return () => {
      shellObserver.disconnect();
      navObserver?.disconnect();
      window.removeEventListener("resize", onViewportResize);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onSettled);
    };
  }, [mount]);

  if (!mount) {
    return null;
  }

  if (
    shouldSuppressShellScrollportGridForIframeContainedEdit({
      requiresIframeContainedEditGrid,
    })
  ) {
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
