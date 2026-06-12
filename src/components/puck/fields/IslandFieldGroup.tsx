"use client";

/**
 * @fileoverview Compact island layout editor for Puck blocks.
 *
 * @module src/components/puck/fields/IslandFieldGroup
 */

import { useMemo } from "react";
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
import {
  ISLAND_BORDER_WIDTH_OPTIONS,
  ISLAND_RADIUS_OPTIONS,
} from "../lib/fieldOptionLabels";
import { hasAncestorWithActiveIsland, hasAncestorWithSlotShell } from "../lib/puckDataTree";
import { useNexusPuck } from "../lib/useNexusPuck";
import { FieldChapter, IslandIcon } from "./FieldChapter";
import { PuckSelectField } from "./PuckSelectField";
import { PuckSwitchField } from "./PuckSwitchField";


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
        <PuckSelectField
          value={stored}
          onChange={onChange}
          options={options.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
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

  const selectedId = useNexusPuck(
    (state) => state.selectedItem?.props?.id as string | undefined,
  );
  const puckData = useNexusPuck((state) => state.appState.data);

  const blockedByParent = useMemo(() => {
    if (!selectedId || !puckData) return false;
    return hasAncestorWithActiveIsland(puckData, selectedId);
  }, [puckData, selectedId]);

  const inSlotShell = useMemo(() => {
    if (!selectedId || !puckData) return false;
    return hasAncestorWithSlotShell(puckData, selectedId);
  }, [puckData, selectedId]);

  const blockedReason = useMemo(() => {
    if (!selectedId || !puckData) return undefined;
    if (hasAncestorWithActiveIsland(puckData, selectedId)) {
      return "Disabled — parent block already uses island mode.";
    }
    return undefined;
  }, [puckData, selectedId]);

  const slotShellHint =
    inSlotShell && !enabled && !blockedByParent
      ? "Off by default in carousel and tab slides — enable if you need an extra frame."
      : undefined;

  const set = <K extends keyof IslandProps>(key: K, next: IslandProps[K]) => {
    onChange(patchIsland(island, key, next));
  };

  const handleIslandToggle = (next: string) => {
    onChange({
      ...patchIsland(island, "islandEnabled", next === "on"),
      islandUserOverride: true,
    });
  };

  return (
    <FieldChapter title="Island" icon={<IslandIcon />}>
      <div className="nexus-field-category">
        <PuckSwitchField
          label="Island mode"
          value={enabled ? "on" : "off"}
          onChange={handleIslandToggle}
          trueValue="on"
          falseValue="off"
          disabled={blockedByParent}
          description={blockedReason ?? slotShellHint}
        />
      </div>

      {enabled && !blockedByParent ? (
        <>
          <div className="nexus-field-category">
            <span className="nexus-field-category__label">Layout</span>
            <div className="nexus-field-grid">
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Width</span>
                <PuckSelectField
                  value={widthToken}
                  onChange={(next) => set("islandMaxWidth", next as ContentWidthToken)}
                  options={CONTENT_WIDTH_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value,
                  }))}
                />
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Align</span>
                <PuckSelectField
                  value={island.islandAlign ?? "center"}
                  onChange={(next) =>
                    set("islandAlign", next as IslandProps["islandAlign"])
                  }
                  options={[
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                  ]}
                />
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
                <PuckSelectField
                  value={island.islandBorderWidth ?? "thin"}
                  onChange={(next) =>
                    set("islandBorderWidth", next as IslandProps["islandBorderWidth"])
                  }
                  options={ISLAND_BORDER_WIDTH_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value,
                  }))}
                />
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Radius</span>
                <PuckSelectField
                  value={island.islandRadius ?? "md"}
                  onChange={(next) =>
                    set("islandRadius", next as IslandProps["islandRadius"])
                  }
                  options={ISLAND_RADIUS_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.value,
                  }))}
                />
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">Padding</span>
                <PuckSelectField
                  value={paddingToken}
                  onChange={(next) => set("islandPadding", next as SpacingToken)}
                  options={SPACING_TOKEN_LABELS.filter((opt) => opt.value !== "custom").map(
                    (opt) => ({ label: opt.label, value: opt.value }),
                  )}
                />
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
