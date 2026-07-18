"use client";

/**
 * @fileoverview Compact island layout editor for Puck blocks.
 *
 * @module src/components/puck/fields/IslandFieldGroup
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { IslandProps, SpacingToken } from "../lib/spacingFields";
import { normalizeIslandMaxWidthSelect } from "../lib/spacingFields";
import {
  getColorOptionsForGroup,
  normalizeColorToken,
  resolveNexusColor,
} from "../lib/nexusColorTokens";
import { formatSpacingResolvedHint, SPACING_TOKEN_LABELS } from "../lib/spacingDisplay";
import type { SpacingCustomUnit } from "../lib/spacingCustomValue";
import {
  ISLAND_BORDER_WIDTH_OPTIONS,
  ISLAND_MAX_WIDTH_OPTIONS,
  ISLAND_RADIUS_OPTIONS,
} from "../lib/fieldOptionLabels";
import { hasAncestorWithActiveIsland, hasAncestorWithSlotShell } from "../lib/puckDataTree";
import { useNexusPuck } from "../lib/useNexusPuck";
import { CustomDimensionInput } from "./CustomDimensionInput";
import { FieldChapter, IslandIcon } from "./FieldChapter";
import { FieldLabelRow } from "./FieldLabelRow";
import { PuckSelectField } from "./PuckSelectField";
import { PuckSwitchField } from "./PuckSwitchField";
import { translatePuckSidebarCopy } from "../lib/translatePuckSidebarCopy";

const PADDING_UNITS: SpacingCustomUnit[] = ["px", "rem", "em", "%"];
const WIDTH_UNITS: SpacingCustomUnit[] = ["px", "rem", "%"];
const BORDER_UNITS: SpacingCustomUnit[] = ["px"];
const RADIUS_UNITS: SpacingCustomUnit[] = ["px", "rem"];

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
    <div className="nexus-field-grid__cell">
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
  const tLabels = useTranslations("puck.fieldLabels");
  const tOptions = useTranslations("puck.fieldOptions");
  const enabled = Boolean(island.islandEnabled);
  const widthToken = normalizeIslandMaxWidthSelect(island.islandMaxWidth);
  const paddingToken = (island.islandPadding ?? "md") as SpacingToken;
  const borderWidthToken = island.islandBorderWidth ?? "thin";
  const radiusToken = island.islandRadius ?? "md";

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
      return tLabels("island_blocked_parent");
    }
    return undefined;
  }, [puckData, selectedId, tLabels]);

  const slotShellHint =
    inSlotShell && !enabled && !blockedByParent ? tLabels("island_slot_hint") : undefined;

  const set = <K extends keyof IslandProps>(key: K, next: IslandProps[K]) => {
    if (island[key] === next) return;
    onChange(patchIsland(island, key, next));
  };

  const handleIslandToggle = (next: string) => {
    onChange({
      ...patchIsland(island, "islandEnabled", next === "on"),
      islandUserOverride: true,
    });
  };

  const layoutWidthHint = !enabled ? tLabels("island_layout_width_hint") : undefined;

  const layoutControls = (
    <div className="nexus-field-category">
      <FieldLabelRow
        label={enabled ? tLabels("layout") : tLabels("content_width")}
        hint={layoutWidthHint}
      />
      <div className="nexus-field-grid nexus-field-grid--stack">
        <div className="nexus-field-grid__cell">
          <span className="nexus-field-grid__label">{tLabels("max_width")}</span>
          <PuckSelectField
            value={widthToken}
            onChange={(next) =>
              set("islandMaxWidth", next as IslandProps["islandMaxWidth"])
            }
            options={ISLAND_MAX_WIDTH_OPTIONS.map((opt) => ({
              label: translatePuckSidebarCopy(opt.label, tOptions),
              value: opt.value,
            }))}
          />
          {widthToken === "custom" ? (
            <CustomDimensionInput
              value={island.islandMaxWidthCustom}
              onChange={(next) => set("islandMaxWidthCustom", next)}
              units={WIDTH_UNITS}
              ariaLabel={tLabels("custom_max_width")}
            />
          ) : null}
        </div>
        <div className="nexus-field-grid__cell">
          <span className="nexus-field-grid__label">{tLabels("align")}</span>
          <PuckSelectField
            value={island.islandAlign ?? "center"}
            onChange={(next) =>
              set("islandAlign", next as IslandProps["islandAlign"])
            }
            options={[
              { label: translatePuckSidebarCopy("Left", tOptions), value: "left" },
              { label: translatePuckSidebarCopy("Center", tOptions), value: "center" },
              { label: translatePuckSidebarCopy("Right", tOptions), value: "right" },
            ]}
          />
        </div>
      </div>
    </div>
  );

  return (
    <FieldChapter title={tLabels("island")} icon={<IslandIcon />}>
      <div className="nexus-field-category">
        <PuckSwitchField
          label={tLabels("island_mode")}
          value={enabled ? "on" : "off"}
          onChange={handleIslandToggle}
          trueValue="on"
          falseValue="off"
          disabled={blockedByParent}
          description={blockedReason ?? slotShellHint}
        />
      </div>

      {!blockedByParent ? layoutControls : null}

      {enabled && !blockedByParent ? (
        <>
          <div className="nexus-field-category">
            <span className="nexus-field-category__label">{tLabels("colors")}</span>
            <div className="nexus-field-grid nexus-field-grid--stack">
              <ColorRow
                label={tLabels("fill")}
                group="island-fill"
                value={island.islandFillPreset ?? "glass-panel"}
                onChange={(v) => set("islandFillPreset", v)}
              />
              <ColorRow
                label={tLabels("border")}
                group="island-border"
                value={island.islandBorderPreset ?? "border-default"}
                onChange={(v) => set("islandBorderPreset", v)}
              />
            </div>
          </div>

          <div className="nexus-field-category">
            <span className="nexus-field-category__label">{tLabels("shape")}</span>
            <div className="nexus-field-grid nexus-field-grid--stack">
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">{tLabels("border")}</span>
                <PuckSelectField
                  value={borderWidthToken}
                  onChange={(next) =>
                    set("islandBorderWidth", next as IslandProps["islandBorderWidth"])
                  }
                  options={ISLAND_BORDER_WIDTH_OPTIONS.map((opt) => ({
                    label: translatePuckSidebarCopy(opt.label, tOptions),
                    value: opt.value,
                  }))}
                />
                {borderWidthToken === "custom" ? (
                  <CustomDimensionInput
                    value={island.islandBorderWidthCustom}
                    onChange={(next) => set("islandBorderWidthCustom", next)}
                    units={BORDER_UNITS}
                    ariaLabel={tLabels("custom_border_width")}
                  />
                ) : null}
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">{tLabels("corner_radius")}</span>
                <PuckSelectField
                  value={radiusToken}
                  onChange={(next) =>
                    set("islandRadius", next as IslandProps["islandRadius"])
                  }
                  options={ISLAND_RADIUS_OPTIONS.map((opt) => ({
                    label: translatePuckSidebarCopy(opt.label, tOptions),
                    value: opt.value,
                  }))}
                />
                {radiusToken === "custom" ? (
                  <CustomDimensionInput
                    value={island.islandRadiusCustom}
                    onChange={(next) => set("islandRadiusCustom", next)}
                    units={RADIUS_UNITS}
                    ariaLabel={tLabels("custom_corner_radius")}
                  />
                ) : null}
              </div>
              <div className="nexus-field-grid__cell">
                <span className="nexus-field-grid__label">{tLabels("padding")}</span>
                <PuckSelectField
                  value={paddingToken}
                  onChange={(next) => set("islandPadding", next as SpacingToken)}
                  options={SPACING_TOKEN_LABELS.map((opt) => ({
                    label: translatePuckSidebarCopy(opt.label, tOptions),
                    value: opt.value,
                  }))}
                />
                {formatSpacingResolvedHint(
                  paddingToken,
                  paddingToken === "custom" ? island.islandPaddingCustom : undefined,
                ) ? (
                  <span className="nexus-field-grid__resolved">
                    {formatSpacingResolvedHint(
                      paddingToken,
                      paddingToken === "custom" ? island.islandPaddingCustom : undefined,
                    )}
                  </span>
                ) : null}
                {paddingToken === "custom" ? (
                  <CustomDimensionInput
                    value={island.islandPaddingCustom}
                    onChange={(next) => set("islandPaddingCustom", next)}
                    units={PADDING_UNITS}
                    ariaLabel={tLabels("custom_island_padding")}
                  />
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
