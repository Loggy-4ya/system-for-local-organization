"use client";

/**
 * @fileoverview Custom Puck field for RGBA / hex color selection.
 *
 * Combines a native color input, alpha slider, and freeform CSS color text.
 *
 * @module src/components/puck/fields/RgbaColorField
 */

import { FieldLabel } from "@measured/puck";
import { useCallback, useEffect, useState } from "react";

/** Props passed by Puck to custom field renderers. */
interface RgbaColorFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Parse a CSS color string into hex + alpha components for the native inputs.
 *
 * @param input - User-provided CSS color (hex, rgb, rgba).
 * @returns Hex `#rrggbb` and alpha 0–1.
 */
function parseColor(input: string): { hex: string; alpha: number } {
  const fallback = { hex: "#000000", alpha: 1 };
  if (!input) return fallback;

  const rgbaMatch = input.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1;
    const hex = `#${[r, g, b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")}`;
    return { hex, alpha: Number.isFinite(a) ? a : 1 };
  }

  const hexMatch = input.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return { hex: `#${hex.slice(0, 6)}`, alpha: 1 };
  }

  return fallback;
}

/**
 * Build a CSS color string from hex and alpha.
 *
 * @param hex - `#rrggbb` color.
 * @param alpha - Opacity 0–1.
 * @returns `rgba(...)` when alpha &lt; 1, otherwise hex.
 */
function toCssColor(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/**
 * RGBA color picker field for Puck sidebars.
 *
 * @param props - Puck custom field props.
 * @returns Styled color picker control.
 */
export function RgbaColorField({ field, value, onChange }: RgbaColorFieldProps) {
  const parsed = parseColor(value || "");
  const [hex, setHex] = useState(parsed.hex);
  const [alpha, setAlpha] = useState(parsed.alpha);
  const [text, setText] = useState(value || "");

  useEffect(() => {
    const next = parseColor(value || "");
    setHex(next.hex);
    setAlpha(next.alpha);
    setText(value || "");
  }, [value]);

  const emit = useCallback(
    (nextHex: string, nextAlpha: number) => {
      const css = toCssColor(nextHex, nextAlpha);
      setText(css);
      onChange(css);
    },
    [onChange],
  );

  return (
    <FieldLabel label={field.label || "Color"}>
      <div className="nexus-puck-field" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              emit(e.target.value, alpha);
            }}
            style={{ width: 40, height: 32, padding: 0, border: "none", cursor: "pointer" }}
            aria-label="Color swatch"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="#rrggbb or rgba(...)"
          />
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>Opacity ({Math.round(alpha * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(alpha * 100)}
            onChange={(e) => {
              const nextAlpha = Number(e.target.value) / 100;
              setAlpha(nextAlpha);
              emit(hex, nextAlpha);
            }}
          />
        </label>
      </div>
    </FieldLabel>
  );
}

export default RgbaColorField;
