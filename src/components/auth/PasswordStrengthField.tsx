/**
 * @fileoverview Password input with inline strength feedback for signup.
 *
 * @module src/components/auth/PasswordStrengthField
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/form-field";
import { assessPasswordStrength } from "@shared/lib/passwordStrength";
import { CONTENT_POLICY_WEAK_PASSWORD_MESSAGE } from "@shared/constants/contentPolicy";
import { cn } from "@/lib/utils";

/** Props for {@link PasswordStrengthField}. */
export interface PasswordStrengthFieldProps {
  /** Input element id. */
  id: string;
  /** Field label. */
  label: string;
  /** Current password value. */
  value: string;
  /** Change handler. */
  onChange: (value: string) => void;
  /** Login handle — used to reject password-equal-to-login. */
  login?: string;
  /** External validation error from Zod submit. */
  error?: string;
  /** Autocomplete token. */
  autoComplete?: "new-password" | "current-password";
  /** Whether the field is disabled. */
  disabled?: boolean;
}

const STRENGTH_KEYS = ["veryWeak", "weak", "fair", "good", "strong"] as const;

/** Maps canonical English issue strings from {@link assessPasswordStrength} to message keys. */
const ISSUE_KEY_BY_ENGLISH: Record<string, "tooShort" | "sameAsLogin" | "tooCommon" | "repeatedChar" | "mixRequired"> = {
  "Password must be at least 8 characters.": "tooShort",
  "Password cannot be the same as your login.": "sameAsLogin",
  [CONTENT_POLICY_WEAK_PASSWORD_MESSAGE]: "tooCommon",
  "Password cannot be a single repeated character.": "repeatedChar",
  "Use a mix of letters, numbers, or symbols (at least two character types).": "mixRequired",
};

/**
 * Password field with strength meter and issue list for signup flows.
 *
 * @param props - See {@link PasswordStrengthFieldProps}.
 * @returns Password field with strength hints.
 */
export function PasswordStrengthField({
  id,
  label,
  value,
  onChange,
  login,
  error,
  autoComplete = "new-password",
  disabled = false,
}: PasswordStrengthFieldProps) {
  const tStrength = useTranslations("auth.passwordStrength");

  const assessment = useMemo(
    () => (value ? assessPasswordStrength(value, login) : null),
    [value, login],
  );

  const strengthLabel =
    assessment && value.length > 0
      ? tStrength(STRENGTH_KEYS[Math.max(0, assessment.score)])
      : null;

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <div className="flex flex-col">
        <PasswordInput
          id={id}
          name={id}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
          aria-invalid={Boolean(error) || assessment?.isWeak}
        />

        {value.length > 0 && assessment && (
          <div className="mt-2 flex flex-col gap-1.5" aria-live="polite">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((segment) => (
                  <div
                    key={segment}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      assessment.score > segment
                        ? assessment.isWeak
                          ? "bg-[var(--color-accent-warning,#f59e0b)]"
                          : "bg-[var(--color-accent-user)]"
                        : "bg-[var(--color-border-default)]",
                    )}
                  />
                ))}
              </div>
              {strengthLabel && (
                <span className="text-xs text-(--color-text-secondary)">{strengthLabel}</span>
              )}
            </div>

            {assessment.issues.length > 0 && (
              <ul className="list-inside list-disc text-xs text-(--color-text-secondary)">
                {assessment.issues.map((issue) => {
                  const key = ISSUE_KEY_BY_ENGLISH[issue];
                  return <li key={issue}>{key ? tStrength(key) : issue}</li>;
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}

export default PasswordStrengthField;
