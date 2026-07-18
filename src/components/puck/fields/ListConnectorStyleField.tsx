"use client";

/**
 * @fileoverview Connector style select with mini visual previews for the List Style chapter.
 *
 * @module src/components/puck/fields/ListConnectorStyleField
 */

import { FieldLabel } from "@puckeditor/core";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeConnectorStyle,
  type ListConnectorStyle,
} from "../lib/listStepTree";
import { translatePuckSidebarCopy } from "../lib/translatePuckSidebarCopy";

/** Props passed by Puck to the connector style field. */
interface ListConnectorStyleFieldProps {
  field: { label?: string };
  value: ListConnectorStyle | undefined;
  onChange: (value: ListConnectorStyle) => void;
}

/** Labeled connector option with short description. */
const CONNECTOR_OPTIONS: Array<{
  value: ListConnectorStyle;
  label: string;
  hintKey:
    | "solid_vertical_line"
    | "broken_dash_rhythm"
    | "dot_trail_between_steps"
    | "spine_nested_branches"
    | "soft_track_column"
    | "hollow_ring_markers"
    | "chevron_links"
    | "dots_only_no_connectors";
}> = [
  { value: "spine", label: "Spine", hintKey: "solid_vertical_line" },
  { value: "dashed", label: "Dashed", hintKey: "broken_dash_rhythm" },
  { value: "dotted", label: "Dotted", hintKey: "dot_trail_between_steps" },
  { value: "tree", label: "Tree", hintKey: "spine_nested_branches" },
  { value: "rail", label: "Rail", hintKey: "soft_track_column" },
  { value: "ring", label: "Ring", hintKey: "hollow_ring_markers" },
  { value: "arrow", label: "Arrow", hintKey: "chevron_links" },
  { value: "minimal", label: "Minimal", hintKey: "dots_only_no_connectors" },
];

/**
 * Mini CSS preview of a connector style for the Style chapter picker.
 *
 * @param props.style - Connector token to preview.
 * @returns Decorative swatch element.
 */
function ConnectorStylePreview({ style }: { style: ListConnectorStyle }) {
  return (
    <span
      className={cn(
        "nexus-list-connector-preview",
        `nexus-list-connector-preview--${style}`,
      )}
      aria-hidden
    >
      <span className="nexus-list-connector-preview__dot nexus-list-connector-preview__dot--a" />
      <span className="nexus-list-connector-preview__link" />
      <span className="nexus-list-connector-preview__dot nexus-list-connector-preview__dot--b" />
      {style === "arrow" ? (
        <ChevronDown className="nexus-list-connector-preview__arrow-icon" size={8} aria-hidden />
      ) : null}
    </span>
  );
}

/**
 * Visual picker for how step markers connect on the canvas.
 *
 * @param props - Puck custom field props.
 * @returns Connector style grid control.
 */
export function ListConnectorStyleField({
  field,
  value,
  onChange,
}: ListConnectorStyleFieldProps) {
  const resolved = normalizeConnectorStyle(value);
  const tLabels = useTranslations("puck.fieldLabels");
  const tOptions = useTranslations("puck.fieldOptions");

  return (
    <FieldLabel label={translatePuckSidebarCopy(field.label ?? "Connections", tLabels)}>
      <div className="nexus-list-step-field nexus-sidebar-field">
        <div
          className="nexus-list-connector-picker"
          role="radiogroup"
          aria-label={tLabels("connection_style")}
        >
          {CONNECTOR_OPTIONS.map((option) => {
            const active = resolved === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={tLabels(option.hintKey)}
                className={cn(
                  "nexus-list-connector-picker__option",
                  active && "nexus-list-connector-picker__option--active",
                )}
                onClick={() => onChange(option.value)}
              >
                <ConnectorStylePreview style={option.value} />
                <span className="nexus-list-connector-picker__label">
                  {translatePuckSidebarCopy(option.label, tOptions)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </FieldLabel>
  );
}

export default ListConnectorStyleField;
