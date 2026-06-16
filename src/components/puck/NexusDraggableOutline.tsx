"use client";

/**
 * @fileoverview Draggable Puck outline tree with cross-zone move + sibling reorder.
 *
 * @module src/components/puck/NexusDraggableOutline
 */

import { ChevronDown, GripVertical, Layers } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import {
  allowOutlineDrop,
  NexusOutlineDragProvider,
  useOutlineDrag,
  type OutlineDragCommit,
} from "@/components/puck/NexusOutlineDragContext";
import {
  buildOutlineTrees,
  type OutlineIndexes,
  type OutlineLayerNode,
  type OutlineZoneTree,
} from "@/components/puck/lib/outlineTreeModel";
import { componentDrawerIcon } from "@/components/puck/lib/puckIcons";
import {
  OUTLINE_NEST_OFFSET_PX,
  OUTLINE_OUTDENT_OFFSET_PX,
} from "@/components/puck/lib/outlineSortableLogic";
import {
  isValidNexusGridItemDestinationZone,
  NEXUS_GRID_ITEM_TYPE,
} from "@/components/puck/lib/nexusGridItemZonePolicy";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { useOutlineRowPointerDrag } from "@/components/puck/lib/useOutlineRowPointerDrag";

/** Puck store private indexes exposed at runtime by `createUsePuck`. */
interface PuckPrivateIndexes {
  nodes: OutlineIndexes["nodes"];
  zones: OutlineIndexes["zones"];
}

/** Puck hook store with private indexed state. */
interface PuckStoreWithPrivate {
  __private?: {
    appState: {
      indexes: PuckPrivateIndexes;
    };
  };
}

/** Stable empty set used when expand state is not yet wired (e.g. HMR). */
const EMPTY_EXPANDED_IDS = new Set<string>();

/** Props for one outline layer row header. */
interface OutlineLayerRowProps {
  node: OutlineLayerNode;
  isSelected: boolean;
  isExpanded: boolean;
  canDrag: boolean;
  onSelect: (node: OutlineLayerNode) => void;
}

/** Props for a zone section and its sibling list. */
interface OutlineZoneSectionProps {
  tree: OutlineZoneTree;
  selectedId: string | null;
  selectedPathIds: Set<string>;
  expandedIds: Set<string>;
  onSelect: (node: OutlineLayerNode) => void;
  resolveCanDrag: (node: OutlineLayerNode) => boolean;
  /** Whether this zone is a page-root drop list. */
  isRootZone?: boolean;
}

/** Props for an explicit insertion slot between siblings. */
interface OutlineDropSlotProps {
  destinationZone: string;
  destinationIndex: number;
}

/** Props for the outline tree drag capture surface. */
interface OutlineTreeSurfaceProps {
  children: ReactNode;
}

/** Props for a trailing bottom drop pad in a zone list. */
interface OutlineZoneBottomPadProps {
  destinationZone: string;
  destinationIndex: number;
  /** Expand to fill remaining outline panel height. */
  isRootZone?: boolean;
}

/** Props for the animated child-zone reveal panel under a layer row. */
interface OutlineChildrenPanelProps {
  /** Whether nested child zones should be visible. */
  isOpen: boolean;
  children: ReactNode;
}

/**
 * Animate nested outline zones open/closed with a height + fade transition.
 *
 * @param props - Panel props.
 * @returns Animated children wrapper.
 */
function OutlineChildrenPanel({ isOpen, children }: OutlineChildrenPanelProps) {
  return (
    <div
      className={[
        "nexus-outline-children",
        isOpen ? "nexus-outline-children--open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!isOpen}
    >
      <div className="nexus-outline-children__inner">{children}</div>
    </div>
  );
}

/**
 * Capture-phase drag surface so drops resolve even when the pointer is over
 * nested buttons, empty panel space, or insertion pads.
 *
 * @param props - Surface props.
 * @returns Outline tree wrapper.
 */
function OutlineTreeSurface({ children }: OutlineTreeSurfaceProps) {
  const { dragSource, hoverFromPointer, commitDrop } = useOutlineDrag();

  return (
    <div
      className="nexus-outline-tree"
      onDragOverCapture={(event) => {
        if (!dragSource) {
          return;
        }

        allowOutlineDrop(event);
        hoverFromPointer(event.clientX, event.clientY);
      }}
      onDropCapture={(event) => {
        if (!dragSource) {
          return;
        }

        allowOutlineDrop(event);
        commitDrop();
      }}
      onPointerMoveCapture={(event) => {
        if (!dragSource) {
          return;
        }

        hoverFromPointer(event.clientX, event.clientY);
      }}
    >
      {children}
    </div>
  );
}

/**
 * Thin insertion target rendered before/after sibling rows.
 *
 * Slots are always mounted (dormant when idle) so the browser can accept
 * drops as soon as a drag starts.
 *
 * @param props - Drop slot props.
 * @returns Drop slot JSX.
 */
function OutlineDropSlot({ destinationZone, destinationIndex }: OutlineDropSlotProps) {
  const { dragSource, dropTarget, hoverZoneTarget, commitDrop } = useOutlineDrag();
  const isDragging = Boolean(dragSource);
  const isActive =
    isDragging &&
    dropTarget?.destinationZone === destinationZone &&
    dropTarget.destinationIndex === destinationIndex;

  return (
    <div
      className={[
        "nexus-outline-drop-slot",
        isDragging ? "nexus-outline-drop-slot--active" : "nexus-outline-drop-slot--dormant",
        isActive ? "nexus-outline-drop-slot--target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-outline-drop-zone={destinationZone}
      data-outline-drop-index={destinationIndex}
      onDragEnter={(event) => {
        if (!dragSource) {
          return;
        }

        allowOutlineDrop(event);
        hoverZoneTarget(destinationZone, destinationIndex);
      }}
      onDragOver={(event) => {
        if (!dragSource) {
          return;
        }

        allowOutlineDrop(event);
        hoverZoneTarget(destinationZone, destinationIndex);
      }}
      onDrop={(event) => {
        if (!dragSource) {
          return;
        }

        allowOutlineDrop(event);
        commitDrop();
      }}
    >
      {isActive ? <span className="nexus-outline-drop-slot__line" aria-hidden /> : null}
    </div>
  );
}

/**
 * Tall drop pad at the bottom of a zone list for append-to-end gestures.
 *
 * @param props - Bottom pad props.
 * @returns Bottom pad JSX.
 */
function OutlineZoneBottomPad({
  destinationZone,
  destinationIndex,
  isRootZone = false,
}: OutlineZoneBottomPadProps) {
  const { dragSource, dropTarget, hoverZoneTarget } = useOutlineDrag();
  const isDragging = Boolean(dragSource);
  const isActive =
    isDragging &&
    dropTarget?.destinationZone === destinationZone &&
    dropTarget.destinationIndex === destinationIndex;

  if (!isDragging) {
    return null;
  }

  return (
    <div
      className={[
        "nexus-outline-zone__bottom-pad",
        isRootZone ? "nexus-outline-zone__bottom-pad--root" : "",
        isActive ? "nexus-outline-zone__bottom-pad--target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-outline-drop-zone={destinationZone}
      data-outline-drop-index={destinationIndex}
      onDragEnter={(event) => {
        allowOutlineDrop(event);
        hoverZoneTarget(destinationZone, destinationIndex);
      }}
      onDragOver={(event) => {
        allowOutlineDrop(event);
        hoverZoneTarget(destinationZone, destinationIndex);
      }}
      onPointerEnter={(event) => {
        hoverZoneTarget(destinationZone, destinationIndex);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        hoverZoneTarget(destinationZone, destinationIndex);
        event.preventDefault();
      }}
    >
      {isActive ? <span className="nexus-outline-zone__bottom-pad__line" aria-hidden /> : null}
    </div>
  );
}

/**
 * Render one component row header in the outline tree.
 *
 * @param props - Row props.
 * @returns Layer row JSX.
 */
function OutlineLayerRow({ node, isSelected, isExpanded, canDrag, onSelect }: OutlineLayerRowProps) {
  const { dragSource, dropTarget, dragPointerOffsetX, hoverRowTarget, commitDrop } = useOutlineDrag();
  const handleSelect = useCallback(() => onSelect(node), [node, onSelect]);
  const {
    handlePointerDown,
    handlePointerUpOnRow,
    isDragging,
    shouldSuppressClick,
  } = useOutlineRowPointerDrag({ canDrag, node, onTap: handleSelect });

  const containsZone = node.childZones.length > 0;
  const primaryNestZone = node.childZones[0]?.zoneCompound;
  const icon = componentDrawerIcon(node.componentType);
  const isNestMode = dragPointerOffsetX >= OUTLINE_NEST_OFFSET_PX;
  const isOutdentMode = dragPointerOffsetX <= OUTLINE_OUTDENT_OFFSET_PX;
  const isNestTarget =
    Boolean(dragSource) &&
    isNestMode &&
    dropTarget?.intent === "nest" &&
    Boolean(primaryNestZone) &&
    dropTarget.destinationZone === primaryNestZone;
  const isOutdentBeforeTarget =
    Boolean(dragSource) &&
    isOutdentMode &&
    dropTarget?.intent === "outdent" &&
    dropTarget.destinationZone === node.zoneCompound &&
    dropTarget.destinationIndex === node.index;
  const isOutdentAfterTarget =
    Boolean(dragSource) &&
    isOutdentMode &&
    dropTarget?.intent === "outdent" &&
    dropTarget.destinationZone === node.zoneCompound &&
    dropTarget.destinationIndex === node.index + 1;
  const isDropBefore =
    isOutdentBeforeTarget ||
    (!dropTarget?.intent &&
      dropTarget?.destinationZone === node.zoneCompound &&
      dropTarget.destinationIndex === node.index);
  const isDropAfter =
    isOutdentAfterTarget ||
    (!dropTarget?.intent &&
      dropTarget?.destinationZone === node.zoneCompound &&
      dropTarget.destinationIndex === node.index + 1);

  const handleRowDragOver = (event: DragEvent<HTMLElement>, position: "before" | "after") => {
    if (!dragSource || dragSource.itemId === node.itemId) {
      return;
    }

    allowOutlineDrop(event);
    hoverRowTarget(node.zoneCompound, node.index, position);
  };

  return (
    <div className="nexus-outline-layer" data-puck-layer-tree-id={node.itemId}>
      <div
        className={[
          "nexus-outline-layer__inner",
          canDrag ? "nexus-outline-layer__inner--draggable" : "",
          isSelected ? "nexus-outline-layer__inner--selected" : "",
          isDragging ? "nexus-outline-layer__inner--dragging" : "",
          isDragging && isOutdentMode ? "nexus-outline-layer__inner--drag-outdent" : "",
          isDragging && isNestMode ? "nexus-outline-layer__inner--drag-nest" : "",
          isDropBefore ? "nexus-outline-layer__inner--drop-before" : "",
          isDropAfter ? "nexus-outline-layer__inner--drop-after" : "",
          isNestTarget ? "nexus-outline-layer__inner--nest-target" : "",
          isOutdentBeforeTarget || isOutdentAfterTarget
            ? "nexus-outline-layer__inner--outdent-target"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-outline-zone={node.zoneCompound}
        data-outline-index={node.index}
        data-outline-item-id={node.itemId}
        {...(primaryNestZone ? { "data-outline-nest-zone": primaryNestZone } : {})}
        aria-grabbed={isDragging}
        aria-label={canDrag ? `Drag ${node.label}` : node.label}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOnRow}
        onDragOver={(event) => {
          if (!dragSource) {
            return;
          }

          const rect = event.currentTarget.getBoundingClientRect();
          const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
          handleRowDragOver(event, position);
        }}
        onDrop={(event) => {
          if (!dragSource) {
            return;
          }

          allowOutlineDrop(event);
          commitDrop();
        }}
      >
        <div className="nexus-outline-layer__handle" aria-hidden>
          <GripVertical size={12} />
        </div>
        <button
          type="button"
          className="nexus-outline-layer__select"
          onClick={() => {
            if (!shouldSuppressClick()) {
              handleSelect();
            }
          }}
        >
          {containsZone ? (
            <span
              className={[
                "nexus-outline-layer__chevron",
                isExpanded ? "nexus-outline-layer__chevron--expanded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden
            >
              <ChevronDown size={12} />
            </span>
          ) : (
            <span className="nexus-outline-layer__chevron-spacer" aria-hidden />
          )}
          <span className="nexus-outline-layer__icon">{icon}</span>
          <span className="nexus-outline-layer__name">{node.label}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Render one zone title and its sibling list.
 *
 * @param props - Zone section props.
 * @returns Zone section JSX.
 */
function OutlineZoneSection({
  tree,
  selectedId,
  selectedPathIds,
  expandedIds = EMPTY_EXPANDED_IDS,
  onSelect,
  resolveCanDrag,
  isRootZone = false,
}: OutlineZoneSectionProps) {
  const { dragSource, dropTarget, hoverZoneTarget, commitDrop } = useOutlineDrag();
  const isZoneDropTarget = dropTarget?.destinationZone === tree.zoneCompound;

  const handleZoneDragOver = (event: DragEvent<HTMLElement>, destinationIndex: number) => {
    if (!dragSource) {
      return;
    }

    allowOutlineDrop(event);
    hoverZoneTarget(tree.zoneCompound, destinationIndex);
  };

  return (
    <div
      className={[
        "nexus-outline-zone",
        isRootZone ? "nexus-outline-zone--root" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-outline-zone={tree.zoneCompound}
    >
      {tree.label ? (
        <div
          className={[
            "nexus-outline-zone__title",
            isZoneDropTarget && dropTarget?.destinationIndex === 0
              ? "nexus-outline-zone__title--drop-target"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-outline-drop-zone={tree.zoneCompound}
          data-outline-drop-index={0}
          onDragEnter={(event) => handleZoneDragOver(event, 0)}
          onDragOver={(event) => handleZoneDragOver(event, 0)}
          onDrop={(event) => {
            if (!dragSource) {
              return;
            }

            allowOutlineDrop(event);
            commitDrop();
          }}
        >
          <span className="nexus-outline-zone__icon">
            <Layers size={16} aria-hidden />
          </span>
          {tree.label}
        </div>
      ) : null}

      <div className="nexus-outline-zone__list">
        <OutlineDropSlot destinationZone={tree.zoneCompound} destinationIndex={0} />

        {tree.items.length === 0 ? (
          <div
            className={[
              "nexus-outline-zone__empty",
              isZoneDropTarget ? "nexus-outline-zone__empty--drop-target" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-outline-drop-zone={tree.zoneCompound}
            data-outline-drop-index={0}
            onDragEnter={(event) => handleZoneDragOver(event, 0)}
            onDragOver={(event) => handleZoneDragOver(event, 0)}
            onDrop={(event) => {
              if (!dragSource) {
                return;
              }

              allowOutlineDrop(event);
              commitDrop();
            }}
          >
            No items
          </div>
        ) : (
          tree.items.map((node, itemIndex) => {
            const isSelected = selectedId === node.itemId;
            const childIsSelected = selectedPathIds.has(node.itemId);
            const isExpanded = expandedIds.has(node.itemId);
            const shouldRenderChildren = isExpanded || childIsSelected;

            return (
              <div key={node.itemId} className="nexus-outline-zone__item-group">
                <OutlineLayerRow
                  node={node}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  canDrag={resolveCanDrag(node)}
                  onSelect={onSelect}
                />
                {node.childZones.length > 0 ? (
                  <OutlineChildrenPanel isOpen={shouldRenderChildren}>
                    {node.childZones.map((childZone) => (
                      <OutlineZoneSection
                        key={childZone.zoneCompound}
                        tree={childZone}
                        selectedId={selectedId}
                        selectedPathIds={selectedPathIds}
                        expandedIds={expandedIds}
                        onSelect={onSelect}
                        resolveCanDrag={resolveCanDrag}
                        isRootZone={false}
                      />
                    ))}
                  </OutlineChildrenPanel>
                ) : null}
                <OutlineDropSlot
                  destinationZone={tree.zoneCompound}
                  destinationIndex={itemIndex + 1}
                />
              </div>
            );
          })
        )}
        <OutlineZoneBottomPad
          destinationZone={tree.zoneCompound}
          destinationIndex={tree.items.length}
          isRootZone={isRootZone}
        />
      </div>
    </div>
  );
}

/**
 * Draggable outline tree for the Puck Outline plugin tab.
 *
 * @returns Outline tree JSX.
 */
export function NexusDraggableOutline(): ReactNode {
  const config = useNexusPuck((state) => state.config);
  const puckData = useNexusPuck((state) => state.appState.data);
  const indexes = useNexusPuck(
    (state) => (state as PuckStoreWithPrivate).__private?.appState.indexes,
  );
  const selectedId = useNexusPuck((state) => state.selectedItem?.props.id ?? null);
  const dispatch = useNexusPuck((state) => state.dispatch);
  const resolveDataById = useNexusPuck((state) => state.resolveDataById);
  const getPermissions = useNexusPuck((state) => state.getPermissions);
  const getItemBySelector = useNexusPuck((state) => state.getItemBySelector);
  const nodes = indexes?.nodes;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  /**
   * Add ancestor ids from a Puck path into the expanded-id set.
   *
   * @param target - Mutable expanded-id set.
   * @param path - Puck node path segments.
   */
  const addAncestorsFromPath = useCallback((target: Set<string>, path: string[] | undefined) => {
    for (const candidate of path ?? []) {
      const ancestorId = candidate.split(":")[0];
      if (ancestorId) {
        target.add(ancestorId);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedId || !nodes) {
      return;
    }

    setExpandedIds((prev) => {
      const next = new Set(prev ?? EMPTY_EXPANDED_IDS);
      addAncestorsFromPath(next, nodes[selectedId]?.path);
      return next;
    });
  }, [addAncestorsFromPath, nodes, selectedId]);

  const handleCommit = useCallback(
    (commit: OutlineDragCommit) => {
      const itemType = nodes?.[commit.itemId]?.data.type;
      if (
        itemType === NEXUS_GRID_ITEM_TYPE &&
        nodes &&
        !isValidNexusGridItemDestinationZone(commit.destinationZone, nodes)
      ) {
        return;
      }

      if (commit.sourceZone === commit.destinationZone) {
        dispatch({
          type: "reorder",
          destinationZone: commit.destinationZone,
          sourceIndex: commit.sourceIndex,
          destinationIndex: commit.destinationIndex,
          recordHistory: true,
        });
      } else {
        dispatch({
          type: "move",
          sourceZone: commit.sourceZone,
          sourceIndex: commit.sourceIndex,
          destinationZone: commit.destinationZone,
          destinationIndex: commit.destinationIndex,
          recordHistory: true,
        });
      }

      void resolveDataById(commit.itemId, "move");
    },
    [dispatch, nodes, resolveDataById],
  );

  const handleSelect = useCallback(
    (node: OutlineLayerNode) => {
      const isSelected = selectedId === node.itemId;
      const hasChildZones = node.childZones.length > 0;

      setExpandedIds((prev) => {
        const next = new Set(prev ?? EMPTY_EXPANDED_IDS);

        if (hasChildZones) {
          if (isSelected) {
            next.delete(node.itemId);
          } else {
            next.add(node.itemId);
          }
        }

        if (!isSelected) {
          addAncestorsFromPath(next, nodes?.[node.itemId]?.path);
        }

        return next;
      });

      dispatch({
        type: "setUi",
        ui: {
          itemSelector: isSelected
            ? null
            : {
                index: node.index,
                zone: node.zoneCompound,
              },
        },
      });
    },
    [addAncestorsFromPath, dispatch, nodes, selectedId],
  );

  const resolveCanDrag = useCallback(
    (node: OutlineLayerNode) => {
      const item = getItemBySelector({
        index: node.index,
        zone: node.zoneCompound,
      });
      return item ? getPermissions({ item }).drag !== false : true;
    },
    [getItemBySelector, getPermissions],
  );

  const selectedPathIds = useMemo(() => {
    if (!selectedId || !nodes) {
      return new Set<string>();
    }

    const selectedPath = nodes[selectedId]?.path;
    return new Set(
      (selectedPath ?? [])
        .map((candidate) => candidate.split(":")[0])
        .filter((candidate): candidate is string => Boolean(candidate)),
    );
  }, [nodes, selectedId]);

  const trees = useMemo(() => {
    if (!indexes) {
      return [];
    }
    return buildOutlineTrees(config, indexes);
  }, [config, indexes, puckData]);

  if (!indexes) {
    return null;
  }

  return (
    <NexusOutlineDragProvider onCommit={handleCommit} outlineNodes={nodes}>
      <OutlineTreeSurface>
        {trees.map((tree) => (
          <OutlineZoneSection
            key={tree.zoneCompound}
            tree={tree}
            selectedId={selectedId}
            selectedPathIds={selectedPathIds}
            expandedIds={expandedIds}
            onSelect={handleSelect}
            resolveCanDrag={resolveCanDrag}
            isRootZone
          />
        ))}
      </OutlineTreeSurface>
    </NexusOutlineDragProvider>
  );
}

export default NexusDraggableOutline;
