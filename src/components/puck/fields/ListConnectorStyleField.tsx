"use client";

/**
 * @fileoverview Connector style select with mini visual previews for the List Style chapter.
 *
 * @module src/components/puck/fields/ListConnectorStyleField
 */

import { FieldLabel } from "@puckeditor/core";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeConnectorStyle,
  type ListConnectorStyle,
} from "../lib/listStepTree";

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
  hint: string;
}> = [
  { value: "spine", label: "Spine", hint: "Solid vertical line" },
  { value: "dashed", label: "Dashed", hint: "Broken dash rhythm" },
  { value: "dotted", label: "Dotted", hint: "Dot trail between steps" },
  { value: "tree", label: "Tree", hint: "Spine + nested branches" },
  { value: "rail", label: "Rail", hint: "Soft track column behind dots" },
  { value: "ring", label: "Ring", hint: "Hollow ring markers" },
  { value: "arrow", label: "Arrow", hint: "Chevron links between steps" },
  { value: "minimal", label: "Minimal", hint: "Dots only — no connectors" },
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

  return (
    <FieldLabel label={field.label ?? "Connections"}>
      <div className="nexus-list-step-field nexus-sidebar-field">
        <div className="nexus-list-connector-picker" role="radiogroup" aria-label="Connection style">
          {CONNECTOR_OPTIONS.map((option) => {
            const active = resolved === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={option.hint}
                className={cn(
                  "nexus-list-connector-picker__option",
                  active && "nexus-list-connector-picker__option--active",
                )}
                onClick={() => onChange(option.value)}
              >
                <ConnectorStylePreview style={option.value} />
                <span className="nexus-list-connector-picker__label">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </FieldLabel>
  );
}

export default ListConnectorStyleField;
