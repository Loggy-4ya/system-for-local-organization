"use client";

/**
 * @fileoverview Cross-platform distribution toggles for Puck form fields (future channels stubbed).
 *
 * @module src/components/puck/fields/FormFieldDistributionField
 */

import { FieldLabel } from "@puckeditor/core";
import { PuckSwitchField } from "./PuckSwitchField";
import type { FormFieldDistributionProps } from "@shared/lib/formFieldLogic";
import { defaultFormFieldDistribution } from "@shared/lib/formFieldLogic";

/** Props passed by Puck to the distribution custom field. */
interface FormFieldDistributionFieldProps {
  field: { label?: string };
  value: FormFieldDistributionProps | undefined;
  onChange: (value: FormFieldDistributionProps) => void;
}

const ROWS: Array<{
  key: keyof FormFieldDistributionProps;
  label: string;
  description: string;
  disabled?: boolean;
}> = [
  {
    key: "web",
    label: "Web (this page)",
    description: "Respondents answer on the published Nexus page.",
    disabled: true,
  },
  {
    key: "telegramMiniApp",
    label: "Telegram Mini App",
    description: "Future: mirror this field inside the Telegram Mini App.",
  },
  {
    key: "telegramBot",
    label: "Telegram Bot",
    description: "Future: push survey prompts through the institutional bot.",
  },
  {
    key: "externalEmbed",
    label: "External embed / API",
    description: "Future: syndicate responses via signed embed or API token.",
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

  const patch = (key: keyof FormFieldDistributionProps, next: "yes" | "no") => {
    onChange({ ...current, [key]: next });
  };

  return (
    <FieldLabel label={field.label ?? "Distribution"}>
      <div className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <PuckSwitchField
            key={row.key}
            label={row.label}
            description={row.description}
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
