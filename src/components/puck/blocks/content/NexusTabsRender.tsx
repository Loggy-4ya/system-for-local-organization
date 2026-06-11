"use client";

/**
 * @fileoverview Interactive tabs render — edit-mode stacked panels + live preview.
 *
 * @module src/components/puck/blocks/content/NexusTabsRender
 */

import { usePuck } from "@measured/puck";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";

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
  tabs: NexusTabItem[];
  defaultActiveIndex: number;
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
 * @param editLayoutMode - Whether editor stacked layout is active.
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
 * Render tab strip + panels. In editor layout mode all panels stack for drop targets.
 * In interactive / published mode only the active panel shows.
 *
 * @param props - Tab configuration and slot components.
 * @returns Tabs UI.
 */
export function NexusTabsRender({
  tabs,
  defaultActiveIndex,
  align,
  size,
  accentColor,
  puck,
}: NexusTabsRenderProps) {
  const { appState } = usePuck();
  const isInteractivePreview = appState.ui.previewMode === "interactive";
  const isEditing = puck?.isEditing ?? false;
  const editLayoutMode = isEditing && !isInteractivePreview;

  const safeIndex = Math.min(
    Math.max(0, defaultActiveIndex),
    Math.max(0, tabs.length - 1),
  );
  const [activeIndex, setActiveIndex] = useState(safeIndex);

  useEffect(() => {
    setActiveIndex(safeIndex);
  }, [safeIndex]);

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

  return (
    <div className="nexus-tabs" style={{ width: "100%" }}>
      <div
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

      {editLayoutMode ? (
        <div className="nexus-tabs__panels nexus-tabs__panels--edit">
          {tabs.map((tab, idx) => (
            <div key={idx} className="nexus-tabs__panel nexus-tabs__panel--edit">
              <div className="nexus-tabs__panel-editor-label">
                Tab {idx + 1}: {tab.label || "Untitled"}
              </div>
              <div className="nexus-tabs__panel-inner">
                {renderTabPanel(
                  tab.panel,
                  140,
                  "nexus-tabs__dropzone",
                  true,
                  "Drag blocks from the sidebar into this tab panel.",
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="nexus-tabs__panels">
          {tabs.map((tab, idx) => {
            const isActive = idx === activeIndex;

            return (
              <div
                key={idx}
                role="tabpanel"
                className="nexus-tabs__panel"
                hidden={!isActive}
                aria-hidden={!isActive}
                style={{ display: isActive ? "block" : "none" }}
              >
                <div className="nexus-tabs__panel-inner">
                  {renderTabPanel(
                    tab.panel,
                    80,
                    undefined,
                    false,
                    "This tab has no content yet.",
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NexusTabsRender;
