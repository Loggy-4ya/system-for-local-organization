"use client";

/**
 * @fileoverview Compact island layout editor for Puck blocks.
 *
 * @module src/components/puck/fields/IslandFieldGroup
 */

import type { IslandProps, SpacingToken } from "../lib/spacingFields";
import {
  CONTENT_WIDTH_OPTIONS,
  normalizeContentWidth,
  type ContentWidthToken,
} from "../lib/contentWidthTokens";
import {
  getColorOptionsForGroup,
  normalizeColorToken,
  resolveNexusColor,
} from "../lib/nexusColorTokens";
import { formatSpacingResolvedHint, SPACING_TOKEN_LABELS } from "../lib/spacingDisplay";
import { FieldChapter, IslandIcon } from "./FieldChapter";
import { SegmentedControl } from "./SegmentedControl";

const BORDER_WIDTH_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Thin", value: "thin" },
  { label: "Medium", value: "medium" },
];

const RADIUS_OPTIONS = [
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
];

/** Puck custom field props for island settings. */
interface IslandFieldGroupProps {
  value: IslandProps;
  onChange: (value: IslandProps) => void;
}

/**
 * Patch one island prop.
 *
 * @param current - Current island object.
 * @param key - Prop key.
 * @param next - New value.
 * @returns Updated island object.
 */
function patchIsland<K extends keyof IslandProps>(
  current: IslandProps,
  key: K,
  next: IslandProps[K],
): IslandProps {
  return { ...current, [key]: next };
}

/**
 * Compact color preset row without nested FieldLabel wrappers.
 *
 * @param props - Label, group, value, onChange.
 * @returns Swatch + select row.
 */
function ColorRow({
  label,
  group,
  value,
  onChange,
}: {
  label: string;
  group: "island-fill" | "island-border";
  value: string;
  onChange: (next: string) => void;
}) {
  const options = getColorOptionsForGroup(group);
  const stored = normalizeColorToken(value) ?? options[0]?.value ?? "";
  const resolved = resolveNexusColor(stored);

  return (
    <div className="nexus-field-grid__cell nexus-field-grid__cell--wide">
      <span className="nexus-field-grid__label">{label}</span>
      <div className="nexus-color-row">
        <span className="nexus-color-row__swatch" style={{ background: resolved }} aria-hidden />
        <select
          className="nexus-puck-select"
          value={stored}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Categorized island controls inside one collapsible chapter.
 *
 * @param props - Puck custom field props.
 * @returns Island field group UI.
 */
export function IslandFieldGroup({ value, onChange }: IslandFieldGroupProps) {
  const island = value ?? {};
  const enabled = Boolean(island.islandEnabled);
  const widthToken = normalizeContentWidth(island.islandMaxWidth) as ContentWidthToken;
  const paddingToken = (island.islandPadding ?? "md") as SpacingToken;

  const set = <K extends keyof IslandProps>(key: K, next: IslandProps[K]) => {
    onChange(patchIsland(island, key, next));
  };

  return (
    <FieldChapter title="Island" icon={<IslandIcon />}>
      <div className="nexus-field-category">
        <SegmentedControl
          ariaLabel="Island mode"
          options={[
            { label: "Off", value: "off" },
            { label: "On", value: "on" },
          ]}
          value={enabled ? "on" : "off"}
          onChange={(v) => set("islandEnabled", v === "on")}
        />
      </div>

      {enabled ? (
        <>
          <div className="nexus-field-category">
            <span className="nexus-field-category__label">Layout</span>
            <div className="nexus-field-grid">
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Width</span>
                <select
                  className="nexus-puck-select"
                  value={widthToken}
                  onChange={(e) =>
                    set("islandMaxWidth", e.target.value as ContentWidthToken)
                  }
                >
                  {CONTENT_WIDTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Align</span>
                <select
                  className="nexus-puck-select"
                  value={island.islandAlign ?? "center"}
                  onChange={(e) => set("islandAlign", e.target.value as IslandProps["islandAlign"])}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>

          <div className="nexus-field-category">
            <span className="nexus-field-category__label">Colors</span>
            <div className="nexus-field-grid">
              <ColorRow
                label="Fill"
                group="island-fill"
                value={island.islandFillPreset ?? "glass-panel"}
                onChange={(v) => set("islandFillPreset", v)}
              />
              <ColorRow
                label="Border"
                group="island-border"
                value={island.islandBorderPreset ?? "border-default"}
                onChange={(v) => set("islandBorderPreset", v)}
              />
            </div>
          </div>

          <div className="nexus-field-category">
            <span className="nexus-field-category__label">Shape</span>
            <div className="nexus-field-grid">
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Border</span>
                <select
                  className="nexus-puck-select"
                  value={island.islandBorderWidth ?? "thin"}
                  onChange={(e) =>
                    set("islandBorderWidth", e.target.value as IslandProps["islandBorderWidth"])
                  }
                >
                  {BORDER_WIDTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Radius</span>
                <select
                  className="nexus-puck-select"
                  value={island.islandRadius ?? "md"}
                  onChange={(e) => set("islandRadius", e.target.value as IslandProps["islandRadius"])}
                >
                  {RADIUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Padding</span>
                <select
                  className="nexus-puck-select"
                  value={paddingToken}
                  onChange={(e) => set("islandPadding", e.target.value as SpacingToken)}
                >
                  {SPACING_TOKEN_LABELS.filter((opt) => opt.value !== "custom").map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formatSpacingResolvedHint(paddingToken) ? (
                  <span className="nexus-field-grid__resolved">
                    {formatSpacingResolvedHint(paddingToken)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </FieldChapter>
  );
}

export default IslandFieldGroup;
