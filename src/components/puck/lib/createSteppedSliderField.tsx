"use client";

/**
 * @fileoverview Factory for Puck custom fields using {@link SteppedSliderField}.
 *
 * @module src/components/puck/lib/createSteppedSliderField
 */

import { SteppedSliderField, type SteppedSliderOption } from "../fields/SteppedSliderField";

/**
 * Create a Puck `custom` field with a labeled stepped slider control.
 *
 * @param label - Sidebar field label.
 * @param options - Discrete slider stops.
 * @returns Puck field definition object.
 */
export function createSteppedSliderField(
  label: string,
  options: readonly SteppedSliderOption[],
) {
  return {
    type: "custom" as const,
    label,
    options: [...options],
    render: SteppedSliderField as never,
  };
}

export default createSteppedSliderField;
