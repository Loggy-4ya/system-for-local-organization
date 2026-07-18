"use client";

/**
 * @fileoverview Viewport / zoom toolbar for Puck inline preview (`iframe.enabled === false`).
 *
 * Puck 0.21 only mounts native `ViewportControls` when the preview iframe is enabled.
 * Inline preview keeps the real `#nexus-bg` visible; this component recreates the toolbar
 * DOM (matching Nexus `puck-editor.css` selectors) and wires it to Puck's app store.
 *
 * @module src/components/puck/NexusInlinePreviewViewportControls
 */

import { useGetPuck } from "@puckeditor/core";
import { Expand, Monitor, Smartphone, Tablet, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { formatViewportZoomLabel } from "@/components/puck/lib/formatViewportZoomLabel";
import { NEXUS_EDITOR_VIEWPORTS } from "@/components/puck/lib/resolveAutoViewport";
import { isInlinePuckPreview } from "@/components/puck/lib/previewIframeDocumentReady";
import {
  DEFAULT_PUCK_ZOOM_CONFIG,
  resolvePuckAppStore,
  sanitizePuckZoomConfig,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import {
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
  PUCK_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";
import { matchesCompactEditorViewport, PUCK_COMPACT_EDITOR_MQ } from "@/components/puck/usePuckMobileEditorChrome";

/** Puck default zoom presets (mirrors `@puckeditor/core` ViewportControls). */
const DEFAULT_ZOOM_OPTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
] as const;

/** CSS-module-compatible class tokens for Nexus viewport toolbar styling. */
const VIEWPORT_CONTROLS_CLASS = "ViewportControls";
const VIEWPORT_CONTROLS_EXPANDED_CLASS = "ViewportControls--isExpanded";
const VIEWPORT_CONTROLS_FULLSCREEN_CLASS = "ViewportControls--fullScreen";
const VIEWPORT_CONTROLS_ACTIONS_CLASS = "ViewportControls-actions_";
const VIEWPORT_CONTROLS_ACTIONS_INNER_CLASS = "ViewportControls-actionsInner_";
const VIEWPORT_CONTROLS_DIVIDER_CLASS = "ViewportControls-divider_";
const VIEWPORT_CONTROLS_ZOOM_CLASS = "ViewportControls-zoom_";
const VIEWPORT_CONTROLS_TOGGLE_CLASS = "ViewportControls-toggleButton_";
const PUCK_CANVAS_CONTROLS_CLASS = "PuckCanvas-controls_";

/**
 * Whether two zoom configs are equivalent for toolbar rendering.
 *
 * @param left - Prior snapshot.
 * @param right - Candidate snapshot.
 * @returns True when zoom fields match.
 */
function zoomConfigSnapshotsEqual(left: PuckZoomConfig, right: PuckZoomConfig): boolean {
  return (
    left.rootHeight === right.rootHeight &&
    left.zoom === right.zoom &&
    left.autoZoom === right.autoZoom
  );
}

/**
 * Resolve the Lucide icon for a viewport preset label.
 *
 * @param icon - Preset icon key from {@link NEXUS_EDITOR_VIEWPORTS}.
 * @returns Icon element.
 */
function renderViewportPresetIcon(icon: string | undefined): ReactNode {
  const props = { size: 16, strokeWidth: 2 } as const;

  switch (icon) {
    case "Tablet":
      return <Tablet {...props} />;
    case "Monitor":
      return <Monitor {...props} />;
    case "FullWidth":
      return <Expand {...props} />;
    default:
      return <Smartphone {...props} />;
  }
}

/**
 * Locate the Puck canvas shell for inline viewport controls.
 *
 * @returns Canvas shell element, or null when unavailable.
 */
function resolveInlineCanvasShell(): HTMLElement | null {
  return (
    (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null)
  );
}

/**
 * Ensure the canvas controls mount node exists (side effects — call from effects only).
 *
 * @returns Controls container inside the Puck canvas shell, or null when unavailable.
 */
function ensureInlineViewportControlsMount(): HTMLElement | null {
  if (typeof document === "undefined" || !isInlinePuckPreview()) {
    return null;
  }

  const canvasShell = resolveInlineCanvasShell();
  if (!canvasShell) {
    return null;
  }

  let controls = canvasShell.querySelector<HTMLElement>(`[class*="${PUCK_CANVAS_CONTROLS_CLASS}"]`);
  if (!controls) {
    controls = document.createElement("div");
    controls.className = PUCK_CANVAS_CONTROLS_CLASS;
    canvasShell.insertBefore(controls, canvasShell.firstChild);
  }

  return controls;
}

/** Props for a viewport toolbar icon button. */
interface ViewportActionButtonProps {
  /** Accessible label / tooltip. */
  title: string;
  /** Click handler. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the preset is active. */
  isActive?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
  /** Button contents. */
  children: ReactNode;
}

/**
 * Icon button matching Puck ViewportControls action affordances.
 *
 * @param props - Button props.
 * @returns Toolbar button element.
 */
function ViewportActionButton({
  title,
  onClick,
  isActive = false,
  disabled = false,
  children,
}: ViewportActionButtonProps) {
  return (
    <span
      className={isActive ? "ViewportButton ViewportButton--isActive" : "ViewportButton"}
      suppressHydrationWarning
    >
      <button
        type="button"
        title={title}
        aria-pressed={isActive}
        disabled={disabled || isActive}
        onClick={onClick}
        className="nexus-inline-viewport-action"
        suppressHydrationWarning
      >
        <span className="ViewportButton-inner" suppressHydrationWarning>
          {children}
        </span>
      </button>
    </span>
  );
}

/**
 * Recreate Puck viewport / zoom controls when the preview iframe is disabled.
 *
 * @returns null — renders via portal when inline preview is active.
 */
export function NexusInlinePreviewViewportControls(): ReactNode {
  const getPuck = useGetPuck();
  const [zoomConfig, setZoomConfigState] = useState<PuckZoomConfig>(DEFAULT_PUCK_ZOOM_CONFIG);
  const [controlsMount, setControlsMount] = useState<HTMLElement | null>(null);
  const autoZoom = zoomConfig.autoZoom;
  const zoom = zoomConfig.zoom;
  const uiViewports = useNexusPuck((state) => state.appState.ui.viewports);
  const controlsVisible = uiViewports.controlsVisible !== false;
  const activeViewportWidth = uiViewports.current.width;
  const fullScreen = matchesCompactEditorViewport();
  const [isExpanded, setIsExpanded] = useState(!fullScreen);

  useEffect(() => {
    setIsExpanded(!fullScreen);
  }, [fullScreen]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let rafId = 0;

    const attachZoomSubscription = (): boolean => {
      const appStore = resolvePuckAppStore();
      if (!appStore || unsubscribe) {
        return Boolean(unsubscribe);
      }

      const syncZoomFromStore = () => {
        setZoomConfigState((prev) => {
          const next = sanitizePuckZoomConfig(appStore.getState().zoomConfig, prev);
          return zoomConfigSnapshotsEqual(prev, next) ? prev : next;
        });
      };

      syncZoomFromStore();
      unsubscribe = (
        appStore as unknown as { subscribe: (listener: () => void) => () => void }
      ).subscribe(syncZoomFromStore);
      return true;
    };

    if (!attachZoomSubscription()) {
      const retry = () => {
        if (!attachZoomSubscription()) {
          rafId = requestAnimationFrame(retry);
        }
      };
      rafId = requestAnimationFrame(retry);
    }

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!controlsVisible || !isInlinePuckPreview()) {
      setControlsMount(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const syncControlsMount = () => {
      if (cancelled) {
        return;
      }

      const mount = ensureInlineViewportControlsMount();
      setControlsMount((prev) => (prev === mount ? prev : mount));
    };

    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncControlsMount);
    };

    syncControlsMount();

    const puckRoot = document.querySelector(".Puck");
    const mountObserver =
      puckRoot &&
      new MutationObserver((records) => {
        const onlyPortalNoise = records.every((record) => {
          const target = record.target;
          return (
            target instanceof Node &&
            (target as HTMLElement).closest?.(`[class*="${VIEWPORT_CONTROLS_CLASS}"]`) !== null
          );
        });

        if (onlyPortalNoise) {
          return;
        }

        scheduleSync();
      });

    if (puckRoot) {
      mountObserver?.observe(puckRoot, { childList: true, subtree: true });
    }

    const media = window.matchMedia(PUCK_COMPACT_EDITOR_MQ);
    media.addEventListener("change", scheduleSync);
    window.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, scheduleSync);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      mountObserver?.disconnect();
      media.removeEventListener("change", scheduleSync);
      window.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, scheduleSync);
    };
  }, [controlsVisible, fullScreen]);

  const zoomOptions = useMemo(() => {
    const defaultsContainAutoZoom = DEFAULT_ZOOM_OPTIONS.some((option) => option.value === autoZoom);

    return [
      ...DEFAULT_ZOOM_OPTIONS,
      ...(defaultsContainAutoZoom
        ? []
        : [
            {
              value: autoZoom,
              label: `${(autoZoom * 100).toFixed(0)}% (Auto)`,
            },
          ]),
    ]
      .filter((option) => option.value <= autoZoom)
      .sort((a, b) => (a.value > b.value ? 1 : -1));
  }, [autoZoom]);

  const handleViewportChange = useCallback(
    (viewport: (typeof NEXUS_EDITOR_VIEWPORTS)[number]) => {
      const { appState, dispatch } = getPuck();
      const nextViewport = {
        ...viewport,
        height: viewport.height ?? "auto",
        zoom,
      };

      dispatch({
        type: "setUi",
        ui: {
          viewports: {
            ...appState.ui.viewports,
            current: nextViewport,
          },
        },
        recordHistory: false,
      });
    },
    [getPuck, zoom],
  );

  const handleZoomChange = useCallback((nextZoom: number) => {
    const appStore = resolvePuckAppStore();
    if (!appStore) {
      return;
    }

    const current = sanitizePuckZoomConfig(appStore.getState().zoomConfig);
    appStore.getState().setZoomConfig({
      ...current,
      zoom: nextZoom,
    });
  }, []);

  const zoomSelectOptions = useMemo(
    () =>
      zoomOptions.map((option) => ({
        label: option.label,
        value: option.value.toString(),
      })),
    [zoomOptions],
  );

  if (!controlsVisible || !controlsMount || !isInlinePuckPreview()) {
    return null;
  }

  const viewportControlsClassName = [
    VIEWPORT_CONTROLS_CLASS,
    isExpanded ? VIEWPORT_CONTROLS_EXPANDED_CLASS : "",
    fullScreen ? VIEWPORT_CONTROLS_FULLSCREEN_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={viewportControlsClassName} suppressHydrationWarning>
      <div className={VIEWPORT_CONTROLS_ACTIONS_CLASS}>
        <div className={VIEWPORT_CONTROLS_ACTIONS_INNER_CLASS}>
          {NEXUS_EDITOR_VIEWPORTS.map((viewport, index) => (
            <ViewportActionButton
              key={`${viewport.label ?? "viewport"}-${index}`}
              title={viewport.label ? `Switch to ${viewport.label} viewport` : "Switch viewport"}
              isActive={activeViewportWidth === viewport.width}
              onClick={() => handleViewportChange(viewport)}
            >
              {renderViewportPresetIcon(viewport.icon)}
            </ViewportActionButton>
          ))}
          <div className={VIEWPORT_CONTROLS_DIVIDER_CLASS} />
          <ViewportActionButton
            title="Zoom viewport out"
            disabled={zoom <= (zoomOptions[0]?.value ?? 0)}
            onClick={(event) => {
              event.stopPropagation();
              const currentIndex = Math.max(
                zoomOptions.findIndex((option) => option.value === zoom),
                0,
              );
              handleZoomChange(zoomOptions[Math.max(currentIndex - 1, 0)].value);
            }}
          >
            <ZoomOut size={16} />
          </ViewportActionButton>
          <ViewportActionButton
            title="Zoom viewport in"
            disabled={zoom >= (zoomOptions[zoomOptions.length - 1]?.value ?? zoom)}
            onClick={(event) => {
              event.stopPropagation();
              const currentIndex = zoomOptions.findIndex((option) => option.value === zoom);
              handleZoomChange(
                zoomOptions[Math.min(currentIndex + 1, zoomOptions.length - 1)].value,
              );
            }}
          >
            <ZoomIn size={16} />
          </ViewportActionButton>
          <div className={VIEWPORT_CONTROLS_ZOOM_CLASS}>
            <div className={VIEWPORT_CONTROLS_DIVIDER_CLASS} />
            <div className="nexus-viewport-zoom-enhancer">
              <PuckSelectField
                value={zoom.toString()}
                options={zoomSelectOptions}
                displayLabel={formatViewportZoomLabel(zoom.toString(), zoomSelectOptions, true)}
                contentSide={fullScreen ? "top" : "bottom"}
                className="nexus-viewport-zoom-select__content"
                triggerClassName="nexus-viewport-zoom-select__trigger"
                onChange={(next) => {
                  handleZoomChange(Number.parseFloat(next));
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={VIEWPORT_CONTROLS_TOGGLE_CLASS}
        title="Toggle viewport menu"
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        {isExpanded ? <X size={16} /> : <Monitor size={16} />}
      </button>
    </div>,
    controlsMount,
  );
}

export default NexusInlinePreviewViewportControls;
