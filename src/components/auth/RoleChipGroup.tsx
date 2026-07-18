/**
 * @fileoverview Student title chip selector for registration (Starosta / Deputy / Neither).
 *
 * @module src/components/auth/RoleChipGroup
 */

"use client";

import { useTranslations } from "next-intl";
import type { StudentTitle } from "@shared/models/User";
import { cn } from "@/lib/utils";

/** Props for {@link RoleChipGroup}. */
export interface RoleChipGroupProps {
  /** Currently selected title. */
  value: StudentTitle | null;
  /** Called when the user picks a chip. */
  onChange: (value: StudentTitle) => void;
}

const OPTION_VALUES: StudentTitle[] = ["Starosta", "Deputy", "Neither"];

const OPTION_MESSAGE_KEYS: Record<StudentTitle, "starosta" | "deputy" | "neither"> = {
  Starosta: "starosta",
  Deputy: "deputy",
  Neither: "neither",
};

/**
 * Pill chip group for student council title selection during signup.
 *
 * @param props - See {@link RoleChipGroupProps}.
 * @returns Role chip group JSX.
 */
export function RoleChipGroup({ value, onChange }: RoleChipGroupProps) {
  const t = useTranslations("auth.roleChip");

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("ariaLabel")}>
      {OPTION_VALUES.map((roleValue) => {
        const active = value === roleValue;
        return (
          <button
            key={roleValue}
            type="button"
            onClick={() => onChange(roleValue)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-[var(--color-accent-user)] bg-[color-mix(in_srgb,var(--color-accent-user)_20%,transparent)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
            aria-pressed={active}
          >
            {t(OPTION_MESSAGE_KEYS[roleValue])}
          </button>
        );
      })}
    </div>
  );
}

export default RoleChipGroup;
