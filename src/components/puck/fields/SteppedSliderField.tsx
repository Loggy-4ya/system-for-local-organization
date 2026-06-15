"use client";

/**
 * @fileoverview Discrete stepped slider for Puck sidebar enum fields (carousel presets).
 *
 * Renders a labeled shadcn/Base UI slider with tick labels so each setting group
 * is identifiable inside collapsed field chapters.
 *
 * @module src/components/puck/fields/SteppedSliderField
 */

import { Slider } from "@/components/ui/slider";
import { useMemo } from "react";

/** One discrete stop on the stepped slider. */
export interface SteppedSliderOption {
  label: string;
  value: string;
  title?: string;
}

/** Puck custom field definition carrying stepped options. */
interface SteppedSliderFieldDef {
  label?: string;
  options?: SteppedSliderOption[];
}

/** Puck custom field props for {@link SteppedSliderField}. */
export interface SteppedSliderFieldProps {
  field: SteppedSliderFieldDef;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Map a stored string value to a slider index (defaults to 0).
 *
 * @param options - Discrete stops.
 * @param value - Current stored value.
 * @returns Index into `options`.
 */
function valueToIndex(options: SteppedSliderOption[], value: string): number {
  const index = options.findIndex((opt) => opt.value === value);
  return index >= 0 ? index : 0;
}

/**
 * Labeled stepped slider — one snap per option with tick labels below the track.
 *
 * @param props - Puck custom field props.
 * @returns Stepped slider field UI.
 */
export function SteppedSliderField({ field, value, onChange }: SteppedSliderFieldProps) {
  const options = field.options ?? [];
  const label = field.label ?? "Option";
  const maxIndex = Math.max(options.length - 1, 0);
  const index = valueToIndex(options, String(value ?? ""));
  const selected = options[index];
  const storedValue = String(value ?? "");
  const sliderValue = useMemo(() => [index], [index]);

  const handleIndexChange = (nextIndex: number) => {
    const opt = options[nextIndex];
    if (opt && opt.value !== storedValue) {
      onChange(opt.value);
    }
  };

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="nexus-stepped-slider">
      <div className="nexus-stepped-slider__head">
        <span className="nexus-field-subfield__label">{label}</span>
        {selected ? (
          <span className="nexus-stepped-slider__value" title={selected.title ?? selected.label}>
            {selected.label}
          </span>
        ) : null}
      </div>

      <Slider
        aria-label={label}
        min={0}
        max={maxIndex}
        step={1}
        value={sliderValue}
        onValueChange={(vals) => {
          const next = Array.isArray(vals) ? vals[0] : vals;
          if (typeof next === "number" && next !== index) {
            handleIndexChange(next);
          }
        }}
      />

      <div
        className="nexus-stepped-slider__ticks"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt, tickIndex) => (
          <button
            key={opt.value}
            type="button"
            className={
              tickIndex === index
                ? "nexus-stepped-slider__tick nexus-stepped-slider__tick--active"
                : "nexus-stepped-slider__tick"
            }
            title={opt.title ?? opt.label}
            aria-pressed={tickIndex === index}
            onClick={() => {
              if (opt.value !== storedValue) onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SteppedSliderField;
