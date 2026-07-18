"use client";

/**
 * @fileoverview Compact categorized spacing editor for Puck blocks.
 *
 * @module src/components/puck/fields/SpacingFieldGroup
 */

import type { SpacingProps, SpacingToken } from "../lib/spacingFields";
import type { SpacingCustomUnit } from "../lib/spacingCustomValue";
import { formatSpacingResolvedHint, SPACING_TOKEN_LABELS } from "../lib/spacingDisplay";
import { useTranslations } from "next-intl";
import { translatePuckSidebarCopy } from "../lib/translatePuckSidebarCopy";
import { CustomDimensionInput } from "./CustomDimensionInput";
import { FieldChapter, SpacingIcon } from "./FieldChapter";
import { PuckSelectField } from "./PuckSelectField";

const SPACING_OPTIONS = SPACING_TOKEN_LABELS;

const SPACING_UNITS: SpacingCustomUnit[] = ["px", "rem", "em", "%"];

const PADDING_SIDES: Array<{
  tokenKey: keyof SpacingProps;
  customKey: keyof SpacingProps;
  label: string;
}> = [
  { tokenKey: "paddingTop", customKey: "paddingTopCustom", label: "Top" },
  { tokenKey: "paddingRight", customKey: "paddingRightCustom", label: "Right" },
  { tokenKey: "paddingBottom", customKey: "paddingBottomCustom", label: "Bottom" },
  { tokenKey: "paddingLeft", customKey: "paddingLeftCustom", label: "Left" },
];

const MARGIN_SIDES: Array<{
  tokenKey: keyof SpacingProps;
  customKey: keyof SpacingProps;
  label: string;
}> = [
  { tokenKey: "marginTop", customKey: "marginTopCustom", label: "Top" },
  { tokenKey: "marginRight", customKey: "marginRightCustom", label: "Right" },
  { tokenKey: "marginBottom", customKey: "marginBottomCustom", label: "Bottom" },
  { tokenKey: "marginLeft", customKey: "marginLeftCustom", label: "Left" },
];

/** Puck custom field props for spacing. */
interface SpacingFieldGroupProps {
  value: SpacingProps;
  onChange: (value: SpacingProps) => void;
}

/**
 * Update one spacing prop immutably.
 *
 * @param current - Current spacing object.
 * @param key - Prop key to set.
 * @param next - New value.
 * @returns Updated spacing object.
 */
function patchSpacing(
  current: SpacingProps,
  key: keyof SpacingProps,
  next: string,
): SpacingProps {
  return { ...current, [key]: next };
}

/**
 * Render a 2×2 grid for padding or margin sides.
 *
 * @param sides - Side definitions.
 * @param value - Current spacing values.
 * @param onSideChange - Patch handler.
 * @returns Grid JSX.
 */
function SideGrid({
  sides,
  value,
  onSideChange,
  tLabels,
  tOptions,
}: {
  sides: typeof PADDING_SIDES;
  value: SpacingProps;
  onSideChange: (key: keyof SpacingProps, next: string) => void;
  tLabels: ReturnType<typeof useTranslations<"puck.fieldLabels">>;
  tOptions: ReturnType<typeof useTranslations<"puck.fieldOptions">>;
}) {
  return (
    <div className="nexus-field-grid">
      {sides.map(({ tokenKey, customKey, label }) => {
        const token = (value[tokenKey] as SpacingToken | undefined) ?? "none";
        const sideLabel = translatePuckSidebarCopy(label, tLabels);
        const hint =
          token === "custom"
            ? formatSpacingResolvedHint(token, value[customKey] as string | undefined)
            : formatSpacingResolvedHint(token);
        return (
          <div key={tokenKey} className="nexus-field-grid__cell">
            <span className="nexus-field-grid__label">{sideLabel}</span>
            <PuckSelectField
              value={token}
              onChange={(next) => onSideChange(tokenKey, next)}
              options={SPACING_OPTIONS.map((opt) => ({
                label: translatePuckSidebarCopy(opt.label, tOptions),
                value: opt.value,
              }))}
            />
            {hint ? <span className="nexus-field-grid__resolved">{hint}</span> : null}
            {token === "custom" ? (
              <CustomDimensionInput
                value={value[customKey] as string | undefined}
                onChange={(next) => onSideChange(customKey, next)}
                units={SPACING_UNITS}
                ariaLabel={tLabels("custom_spacing")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Categorized padding + margin controls inside one collapsible chapter.
 *
 * @param props - Puck custom field props.
 * @returns Spacing field group UI.
 */
export function SpacingFieldGroup({ value, onChange }: SpacingFieldGroupProps) {
  const spacing = value ?? {};
  const tLabels = useTranslations("puck.fieldLabels");
  const tOptions = useTranslations("puck.fieldOptions");

  const handleChange = (key: keyof SpacingProps, next: string) => {
    onChange(patchSpacing(spacing, key, next));
  };

  return (
    <FieldChapter title={tLabels("spacing")} icon={<SpacingIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">{tLabels("padding")}</span>
        <SideGrid
          sides={PADDING_SIDES}
          value={spacing}
          onSideChange={handleChange}
          tLabels={tLabels}
          tOptions={tOptions}
        />
      </div>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">{tLabels("margin")}</span>
        <SideGrid
          sides={MARGIN_SIDES}
          value={spacing}
          onSideChange={handleChange}
          tLabels={tLabels}
          tOptions={tOptions}
        />
      </div>
    </FieldChapter>
  );
}

export default SpacingFieldGroup;
