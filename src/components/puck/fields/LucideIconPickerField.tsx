"use client";

/**
 * @fileoverview Puck custom field — whitelisted Lucide icon picker for block settings.
 *
 * Reuses {@link LucideIconPicker} from the global layout editor with Puck flat-control styling.
 *
 * @module src/components/puck/fields/LucideIconPickerField
 */

import { LucideIconPicker } from "@/components/global-layout/LucideIconPicker";
import { ALLOWED_LUCIDE_ICONS, type AllowedLucideIcon } from "@shared/constants/globalLayout";
import { FieldLabelRow } from "./FieldLabelRow";

/** Props passed by Puck to the Lucide icon picker field. */
interface LucideIconPickerFieldProps {
  field: { label?: string };
  value: string | undefined;
  onChange: (value: string) => void;
  id?: string;
}

/**
 * Insert or clear a whitelisted Lucide icon on a Puck block (e.g. {@link NexusList}).
 *
 * @param props - Puck custom field props.
 * @returns Icon picker row for the plugin sidebar.
 */
export function LucideIconPickerField({
  field,
  value,
  onChange,
  id,
}: LucideIconPickerFieldProps) {
  const label = field.label ?? "Icon";

  return (
    <div className="nexus-sidebar-field">
      <FieldLabelRow
        label={label}
        hint="Pick a Lucide icon from the site chrome whitelist, or choose none."
      />
      <LucideIconPicker
        id={id}
        value={value ?? ""}
        onChange={(next) => onChange(next)}
        tooltip={label}
      />
    </div>
  );
}

/**
 * Whether a stored icon value is a whitelisted Lucide name.
 *
 * @param value - Raw prop from Puck data.
 * @returns True when {@link resolveLucideIcon} can render the value.
 */
export function isAllowedLucideIconValue(value: string): value is AllowedLucideIcon {
  return (ALLOWED_LUCIDE_ICONS as readonly string[]).includes(value);
}
