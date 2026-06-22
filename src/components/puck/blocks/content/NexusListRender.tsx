"use client";

/**
 * @fileoverview Stepper list render — editor highlights, connector styles, fixed publish collapse.
 *
 * @module src/components/puck/blocks/content/NexusListRender
 */

import { useEffect, useMemo, type MouseEvent } from "react";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { NexusStepperTimeline } from "@/components/ui/NexusStepperTimeline";
import { cn } from "@/lib/utils";
import {
  buildFlatStepRefs,
  buildVisibleStepRows,
  migrateListItems,
  normalizeConnectorStyle,
  normalizeListStepHtml,
  type ListConnectorStyle,
  type ListStepItem,
} from "../../lib/listStepTree";
import { useListChapterOpenPatch } from "../../lib/useListChapterOpenPatch";
import { resolveSpacingDimension } from "../../lib/resolveSpacingDimension";
import { usePuckPreviewMode } from "../../lib/useNexusPuck";
import { usePuckArrayOpenStripSync } from "../../lib/usePuckArrayOpenStripSync";
import { useStripActiveIndex } from "../../lib/useStripActiveIndex";

/** Default spacing preset map for step gaps. */
const ITEM_SPACING_DEFAULTS = { preset: "md", custom: "8px" };

/** Props for {@link NexusListRender}. */
export interface NexusListRenderProps {
  id?: string;
  items?: ListStepItem[];
  connectorStyle?: ListConnectorStyle;
  editorActiveIndex?: number;
  defaultExpandNested?: "yes" | "no";
  itemSpacing?: unknown;
  puck?: { isEditing?: boolean };
}

/** Internal props for the shared stepper body. */
interface NexusListBodyProps {
  id?: string;
  items: ListStepItem[];
  connectorStyle: ListConnectorStyle;
  defaultExpandNested: "yes" | "no";
  itemSpacing?: unknown;
  editLayoutMode: boolean;
  selectedFlatIndex: number;
  onSelectedFlatIndexChange?: (index: number) => void;
  onToggleChapterOpen?: (parentIndex: number) => void;
}

/**
 * Shared stepper list body — safe inside `<Render>` when props are fully resolved.
 *
 * @param props - List configuration and interaction state.
 * @returns Stepper list UI.
 */
function NexusListBody({
  items,
  connectorStyle,
  defaultExpandNested,
  itemSpacing,
  editLayoutMode,
  selectedFlatIndex,
  onSelectedFlatIndexChange,
  onToggleChapterOpen,
}: NexusListBodyProps) {
  const itemGap = resolveSpacingDimension(itemSpacing, ITEM_SPACING_DEFAULTS, {
    sm: "sm",
    md: "md",
  });

  const visibleRows = useMemo(
    () => buildVisibleStepRows(items, defaultExpandNested),
    [defaultExpandNested, items],
  );

  if (!items.length) {
    return (
      <div className="nexus-stepper-list nexus-stepper-list--empty glass-panel">
        <p>Add at least one step in the sidebar.</p>
      </div>
    );
  }

  const timelineSteps = visibleRows.map((row) => ({
    flatIndex: row.flatIndex,
    isNested: row.depth === 1,
    hasChildren: row.hasChildren,
    isExpanded: row.chapterOpen,
    emphasis: row.emphasis,
    selected: editLayoutMode && selectedFlatIndex === row.flatIndex,
    onToggleExpand: row.hasChildren
      ? (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleChapterOpen?.(row.parentIndex);
        }
      : undefined,
    label: row.labelHtml.trim() ? (
      <NexusRichTextView html={normalizeListStepHtml(row.labelHtml)} enablePagePreviews />
    ) : (
      row.fallbackLabel
    ),
  }));

  return (
    <NexusStepperTimeline
      className={cn("nexus-stepper-list", editLayoutMode && "nexus-stepper-list--edit")}
      steps={timelineSteps}
      connectorStyle={connectorStyle}
      selectedIndex={selectedFlatIndex}
      onSelectedIndexChange={editLayoutMode ? onSelectedFlatIndexChange : undefined}
      itemGap={itemGap}
      editMode={editLayoutMode}
    />
  );
}

/**
 * Puck editor shell — subscribes to Puck store hooks (must render inside `<Puck>`).
 *
 * @param props - List block props from Puck render.
 * @returns Stepper list with edit/interactive preview behavior.
 */
function NexusListEditorShell(props: NexusListRenderProps) {
  const previewMode = usePuckPreviewMode();
  const editLayoutMode = previewMode !== "interactive";
  const defaultExpandNested = props.defaultExpandNested ?? "yes";
  const connectorStyle = normalizeConnectorStyle(props.connectorStyle);

  const items = useMemo(
    () => migrateListItems(props.items, defaultExpandNested),
    [defaultExpandNested, props.items],
  );

  const flatRefs = useMemo(
    () => buildFlatStepRefs(items, defaultExpandNested),
    [defaultExpandNested, items],
  );

  const [selectedFlatIndex, setSelectedFlatIndex] = useStripActiveIndex(
    props.id,
    0,
    Math.max(1, flatRefs.length),
    props.editorActiveIndex,
  );

  const toggleChapterOpen = useListChapterOpenPatch(props.id, defaultExpandNested);

  usePuckArrayOpenStripSync(props.id, "items", editLayoutMode);

  useEffect(() => {
    const activeRef = flatRefs.find((ref) => ref.flatIndex === selectedFlatIndex);
    if (
      activeRef?.childIndex !== null &&
      activeRef?.childIndex !== undefined &&
      items[activeRef.parentIndex]
    ) {
      const parent = items[activeRef.parentIndex];
      if (parent.chapterOpen === "no") {
        toggleChapterOpen(activeRef.parentIndex);
      }
    }
  }, [flatRefs, items, selectedFlatIndex, toggleChapterOpen]);

  return (
    <NexusListBody
      id={props.id}
      items={items}
      connectorStyle={connectorStyle}
      defaultExpandNested={defaultExpandNested}
      itemSpacing={props.itemSpacing}
      editLayoutMode={editLayoutMode}
      selectedFlatIndex={selectedFlatIndex}
      onSelectedFlatIndexChange={setSelectedFlatIndex}
      onToggleChapterOpen={toggleChapterOpen}
    />
  );
}

/**
 * Published / static stepper list — static highlights, fixed collapse, no selection.
 *
 * @param props - List block props from Puck render.
 * @returns Stepper list for the public site.
 */
function NexusListView(props: NexusListRenderProps) {
  const defaultExpandNested = props.defaultExpandNested ?? "yes";
  const connectorStyle = normalizeConnectorStyle(props.connectorStyle);

  const items = useMemo(
    () => migrateListItems(props.items, defaultExpandNested),
    [defaultExpandNested, props.items],
  );

  return (
    <NexusListBody
      items={items}
      connectorStyle={connectorStyle}
      defaultExpandNested={defaultExpandNested}
      itemSpacing={props.itemSpacing}
      editLayoutMode={false}
      selectedFlatIndex={0}
    />
  );
}

/**
 * Stepper list block render — editor shell when `puck.isEditing`, otherwise static view.
 *
 * @param props - List block props from Puck.
 * @returns Stepper list UI.
 */
export function NexusListRender(props: NexusListRenderProps) {
  if (props.puck?.isEditing) {
    return <NexusListEditorShell {...props} />;
  }
  return <NexusListView {...props} />;
}

export default NexusListRender;
