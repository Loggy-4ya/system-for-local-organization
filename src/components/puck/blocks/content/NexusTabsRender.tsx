"use client";

/**
 * @fileoverview Interactive tabs render — strip edit mode + live preview.
 *
 * @module src/components/puck/blocks/content/NexusTabsRender
 */

import { type ComponentType, type CSSProperties } from "react";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";
import { cn } from "@/lib/utils";
import { usePuckOverlayPortalRef } from "../../lib/usePuckOverlayPortal";
import { useStripActiveIndex } from "../../lib/useStripActiveIndex";

/** Puck slot component signature for tab panels. */
type TabPanelComponent = ComponentType<{
  minEmptyHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}>;

/** Tab item with label and nested Puck slot component. */
export interface NexusTabItem {
  label: string;
  panel?: TabPanelComponent;
}

/** Props for {@link NexusTabsRender}. */
export interface NexusTabsRenderProps {
  id?: string;
  tabs: NexusTabItem[];
  defaultActiveIndex: number;
  editorActiveIndex?: number;
  align: "left" | "center" | "right";
  size: "sm" | "md";
  accentColor?: string;
  puck?: { isEditing?: boolean };
}

const SIZE_STYLES = {
  sm: { padding: "6px 10px", fontSize: "11px" },
  md: { padding: "8px 14px", fontSize: "12px" },
};

const ALIGN_STYLES = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

/**
 * Render a tab panel Puck slot when resolved, otherwise an empty hint.
 *
 * @param Panel - Puck slot component for the tab panel.
 * @param minEmptyHeight - Minimum drop zone height.
 * @param className - Optional class for the drop zone.
 * @param editLayoutMode - Whether editor strip layout is active.
 * @param emptyHint - Message when slot is unavailable.
 * @returns Tab panel slot UI.
 */
function renderTabPanel(
  Panel: TabPanelComponent | undefined,
  minEmptyHeight: number | string,
  className: string | undefined,
  editLayoutMode: boolean,
  emptyHint: string,
) {
  if (typeof Panel !== "function") {
    return <p className="nexus-tabs__empty-hint">{emptyHint}</p>;
  }

  return (
    <Panel
      minEmptyHeight={minEmptyHeight}
      className={className}
      style={editLayoutMode ? { padding: "12px" } : undefined}
    />
  );
}

/**
 * Render tab strip + panels. Edit mode keeps all panel slots mounted; inactive panels are hidden.
 *
 * @param props - Tab configuration and slot components.
 * @returns Tabs UI.
 */
export function NexusTabsRender({
  id,
  tabs,
  defaultActiveIndex,
  editorActiveIndex,
  align,
  size,
  accentColor,
  puck,
}: NexusTabsRenderProps) {
  const previewMode = usePuckPreviewMode();
  const isInteractivePreview = previewMode === "interactive";
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && !isInteractivePreview;

  const stripPortalRef = usePuckOverlayPortalRef(isEditing);

  const [activeIndex, setActiveIndex] = useStripActiveIndex(
    id,
    defaultActiveIndex,
    tabs.length,
    editorActiveIndex,
  );

  const activeBg = accentColor || "var(--color-accent-user)";

  if (!tabs.length) {
    return (
      <div className="nexus-tabs nexus-tabs--empty">
        <p>Add at least one tab in the sidebar.</p>
      </div>
    );
  }

  const handleTabClick = (idx: number) => {
    setActiveIndex(idx);
  };

  const emptyHint = editLayoutMode
    ? "Drag blocks from the sidebar into this tab panel."
    : "This tab has no content yet.";

  return (
    <div
      className={cn("nexus-tabs", editLayoutMode && "nexus-tabs--strip-edit")}
      style={{ width: "100%" }}
    >
      <div
        ref={stripPortalRef}
        className="nexus-tabs__strip"
        style={{ justifyContent: ALIGN_STYLES[align] || "flex-start" }}
        role="tablist"
        aria-label="Content tabs"
      >
        <div className="nexus-tabs__list">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              className="nexus-tabs__trigger"
              aria-selected={idx === activeIndex}
              onClick={() => handleTabClick(idx)}
              style={{
                fontWeight: idx === activeIndex ? 600 : 400,
                background: idx === activeIndex ? activeBg : "transparent",
                color: idx === activeIndex ? "#fff" : "var(--color-text-secondary)",
                ...SIZE_STYLES[size],
              }}
            >
              {tab.label || `Tab ${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      <div className="nexus-tabs__panels">
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={idx}
              role="tabpanel"
              className={cn(
                "nexus-tabs__panel",
                editLayoutMode && "nexus-strip-editor__panel",
                editLayoutMode && isActive && "nexus-strip-editor__panel--active",
              )}
              hidden={!isActive}
              aria-hidden={!isActive}
              style={{ display: isActive ? "block" : "none" }}
            >
              <div className="nexus-tabs__panel-inner">
                {renderTabPanel(
                  tab.panel,
                  editLayoutMode ? 140 : 80,
                  editLayoutMode ? "nexus-tabs__dropzone" : undefined,
                  editLayoutMode,
                  emptyHint,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NexusTabsRender;
