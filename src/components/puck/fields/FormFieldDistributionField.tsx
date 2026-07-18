"use client";

/**
 * @fileoverview Cross-platform distribution toggles for Puck form fields (future channels stubbed).
 *
 * @module src/components/puck/fields/FormFieldDistributionField
 */

import { FieldLabel } from "@puckeditor/core";
import { useTranslations } from "next-intl";
import { PuckSwitchField } from "./PuckSwitchField";
import type { FormFieldDistributionProps } from "@shared/lib/formFieldLogic";
import { defaultFormFieldDistribution } from "@shared/lib/formFieldLogic";
import { translatePuckSidebarCopy } from "../lib/translatePuckSidebarCopy";

/** Props passed by Puck to the distribution custom field. */
interface FormFieldDistributionFieldProps {
  field: { label?: string };
  value: FormFieldDistributionProps | undefined;
  onChange: (value: FormFieldDistributionProps) => void;
}

const ROWS: Array<{
  key: keyof FormFieldDistributionProps;
  label: string;
  descriptionKey: "distribution_web_desc" | "distribution_tma_desc" | "distribution_bot_desc" | "distribution_embed_desc";
  disabled?: boolean;
}> = [
  {
    key: "web",
    label: "Web (this page)",
    descriptionKey: "distribution_web_desc",
    disabled: true,
  },
  {
    key: "telegramMiniApp",
    label: "Telegram Mini App",
    descriptionKey: "distribution_tma_desc",
  },
  {
    key: "telegramBot",
    label: "Telegram Bot",
    descriptionKey: "distribution_bot_desc",
  },
  {
    key: "externalEmbed",
    label: "External embed / API",
    descriptionKey: "distribution_embed_desc",
  },
];

/**
 * Distribution chapter control — web is always on; other channels are opt-in stubs.
 *
 * @param props - Puck custom field props.
 * @returns Switch rows for each distribution channel.
 */
export function FormFieldDistributionField({
  field,
  value,
  onChange,
}: FormFieldDistributionFieldProps) {
  const current = { ...defaultFormFieldDistribution(), ...value };
  const tLabels = useTranslations("puck.fieldLabels");
  const tOptions = useTranslations("puck.fieldOptions");

  const patch = (key: keyof FormFieldDistributionProps, next: "yes" | "no") => {
    onChange({ ...current, [key]: next });
  };

  return (
    <FieldLabel label={translatePuckSidebarCopy(field.label ?? "Distribution", tLabels)}>
      <div className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <PuckSwitchField
            key={row.key}
            label={translatePuckSidebarCopy(row.label, tOptions)}
            description={tLabels(row.descriptionKey)}
            value={current[row.key]}
            trueValue="yes"
            falseValue="no"
            disabled={row.disabled}
            onChange={(next) => patch(row.key, next as "yes" | "no")}
          />
        ))}
      </div>
    </FieldLabel>
  );
}

export default FormFieldDistributionField;
