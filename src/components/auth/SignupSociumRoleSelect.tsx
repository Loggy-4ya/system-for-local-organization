/**
 * @fileoverview Signup socium role select — Student, Starosta, or Teacher.
 *
 * Additional socium roles are assigned in the administrator panel.
 *
 * @module src/components/auth/SignupSociumRoleSelect
 */

"use client";

import type { z } from "zod";
import type { signupSociumRoleSchema } from "@shared/validation/authSchemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Self-assignable socium role at signup. */
export type SignupSociumRole = z.infer<typeof signupSociumRoleSchema>;

/** Props for {@link SignupSociumRoleSelect}. */
export interface SignupSociumRoleSelectProps {
  /** Currently selected socium role. */
  value: SignupSociumRole;
  /** Called when the user picks a role. */
  onChange: (value: SignupSociumRole) => void;
  /** Whether the control is disabled. */
  disabled?: boolean;
}

const OPTIONS: { label: string; value: SignupSociumRole }[] = [
  { label: "Student", value: "Student" },
  { label: "Starosta (group leader)", value: "Starosta" },
  { label: "Teacher", value: "Teacher" },
];

/**
 * Select control for self-assignable socium roles during signup.
 *
 * @param props - See {@link SignupSociumRoleSelectProps}.
 * @returns Socium role select JSX.
 */
export function SignupSociumRoleSelect({
  value,
  onChange,
  disabled = false,
}: SignupSociumRoleSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="signup-socium-role" className="text-sm font-medium text-(--color-text-primary)">
        Role in socium
      </label>
      <p className="text-xs text-(--color-text-secondary)">
        Other roles are assigned by administrators after review.
      </p>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as SignupSociumRole);
        }}
        disabled={disabled}
      >
        <SelectTrigger id="signup-socium-role" className="w-full" size="sm">
          <SelectValue placeholder="Select your role…" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SignupSociumRoleSelect;
