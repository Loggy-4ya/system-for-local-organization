"use client";

/**
 * @fileoverview Vertical stepper timeline with structural dot-to-dot connectors.
 *
 * @module src/components/ui/NexusStepperTimeline
 */

import { ChevronDown, ChevronRight, Circle, CircleDot } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { ListConnectorStyle, StepEmphasis } from "@/components/puck/lib/listStepTree";
import { cn } from "@/lib/utils";

/** One row rendered inside the timeline list. */
export interface NexusStepperTimelineStep {
  flatIndex: number;
  label: ReactNode;
  isNested?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  emphasis?: StepEmphasis;
  selected?: boolean;
  onToggleExpand?: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** Props for {@link NexusStepperTimeline}. */
export interface NexusStepperTimelineProps {
  steps: NexusStepperTimelineStep[];
  connectorStyle?: ListConnectorStyle;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  itemGap?: string;
  className?: string;
  editMode?: boolean;
}

/**
 * Lucide marker icon for a step row (hidden for ring style — CSS draws hollow rings).
 *
 * @param emphasis - Authored emphasis level.
 * @param connectorStyle - Active connector style token.
 * @returns Lucide icon or null for ring markers.
 */
function StepMarkerIcon({
  emphasis,
  connectorStyle,
}: {
  emphasis?: StepEmphasis;
  connectorStyle: ListConnectorStyle;
}) {
  if (connectorStyle === "ring") {
    return null;
  }
  if (emphasis === "full") {
    return <CircleDot size={14} strokeWidth={2.25} aria-hidden />;
  }
  return <Circle size={10} strokeWidth={2} aria-hidden />;
}

/**
 * Connector segment between two step dots.
 *
 * @param props.style - Active connector style.
 * @returns Line span, arrow icon, or null for minimal.
 */
function StepConnector({ style }: { style: ListConnectorStyle }) {
  if (style === "minimal") {
    return null;
  }
  if (style === "arrow") {
    return (
      <span className="nexus-stepper-timeline__arrow" aria-hidden>
        <ChevronDown size={14} strokeWidth={2.25} />
      </span>
    );
  }
  return <span className="nexus-stepper-timeline__line" aria-hidden />;
}

/**
 * Build row label shell with emphasis styling.
 *
 * @param row - Timeline row metadata.
 * @param editMode - Whether editor selection chrome is active.
 * @returns Label content wrapped in emphasis classes.
 */
function StepRowLabel({
  row,
  editMode,
}: {
  row: NexusStepperTimelineStep;
  editMode: boolean;
}) {
  const emphasis = row.emphasis ?? "none";

  return (
    <span
      className={cn(
        "nexus-stepper-timeline__row",
        emphasis === "full" && "nexus-stepper-timeline__row--emphasis-full",
        emphasis === "soft" && "nexus-stepper-timeline__row--emphasis-soft",
        row.selected && editMode && "nexus-stepper-timeline__row--selected",
      )}
    >
      <span className="nexus-stepper-timeline__label">{row.label}</span>
    </span>
  );
}

/**
 * Vertical stepper nav — structural connectors, accessible list semantics.
 *
 * @param props - See {@link NexusStepperTimelineProps}.
 * @returns Accessible stepper navigation UI.
 */
export function NexusStepperTimeline({
  steps,
  connectorStyle = "spine",
  selectedIndex = 0,
  onSelectedIndexChange,
  itemGap = "8px",
  className,
  editMode = false,
}: NexusStepperTimelineProps) {
  const rootClassName = cn(
    "nexus-stepper-timeline",
    `nexus-stepper-timeline--connector-${connectorStyle}`,
    editMode && "nexus-stepper-timeline--edit",
    className,
  );

  const handleListKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    if (!editMode || !onSelectedIndexChange || steps.length === 0) return;

    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!delta) return;

    event.preventDefault();
    const next = Math.min(steps.length - 1, Math.max(0, selectedIndex + delta));
    onSelectedIndexChange(next);
  };

  return (
    <nav className={rootClassName} aria-label="Step navigation">
      <ol
        className="nexus-stepper-timeline__list"
        style={{ "--stepper-item-gap": itemGap } as CSSProperties}
        onKeyDown={handleListKeyDown}
      >
        {steps.map((row, index) => {
          const isLast = index === steps.length - 1;
          const emphasis = row.emphasis ?? "none";
          const showConnector = !isLast && connectorStyle !== "minimal";
          const isSelected = editMode && row.selected;

          const labelNode = <StepRowLabel row={row} editMode={editMode} />;

          return (
            <li
              key={row.flatIndex}
              className={cn(
                "nexus-stepper-timeline__item",
                row.isNested && "nexus-stepper-timeline__item--nested",
                emphasis === "full" && "nexus-stepper-timeline__item--emphasis-full",
                emphasis === "soft" && "nexus-stepper-timeline__item--emphasis-soft",
                isSelected && "nexus-stepper-timeline__item--selected",
                isLast && "nexus-stepper-timeline__item--last",
                index === 0 && "nexus-stepper-timeline__item--first",
              )}
              aria-current={isSelected ? "step" : undefined}
            >
              <div className="nexus-stepper-timeline__track" aria-hidden>
                <span
                  className={cn(
                    "nexus-stepper-timeline__dot",
                    emphasis === "full" && "nexus-stepper-timeline__dot--emphasis-full",
                    emphasis === "soft" && "nexus-stepper-timeline__dot--emphasis-soft",
                  )}
                >
                  <StepMarkerIcon emphasis={emphasis} connectorStyle={connectorStyle} />
                </span>
                {showConnector ? <StepConnector style={connectorStyle} /> : null}
              </div>

              <div className="nexus-stepper-timeline__body">
                {editMode && onSelectedIndexChange ? (
                  <button
                    type="button"
                    className={cn(
                      "nexus-stepper-timeline__select",
                      isSelected && "nexus-stepper-timeline__select--selected",
                    )}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => onSelectedIndexChange(row.flatIndex)}
                  >
                    {labelNode}
                  </button>
                ) : (
                  labelNode
                )}

                {editMode && row.hasChildren ? (
                  <button
                    type="button"
                    className="nexus-stepper-timeline__chevron"
                    aria-expanded={row.isExpanded}
                    aria-label={row.isExpanded ? "Collapse sub-steps" : "Expand sub-steps"}
                    onClick={row.onToggleExpand}
                  >
                    {row.isExpanded ? (
                      <ChevronDown size={16} aria-hidden />
                    ) : (
                      <ChevronRight size={16} aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default NexusStepperTimeline;
