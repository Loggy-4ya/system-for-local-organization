"use client";

/**
 * @fileoverview Admin profile editor — academic assignment, contact phone, and read-only email.
 *
 * Specialty and group use creatable catalog selects (new values are auto-approved on save).
 * Email is display-only; phone is editable when the actor can see PII.
 *
 * @module src/components/user-directory/UserDirectoryProfileFields
 */

import React, { useEffect, useMemo, useState } from "react";
import { CreatableCatalogSelect } from "@/components/auth/CreatableCatalogSelect";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { filterPhoneInputChange, phoneInputProps, phoneInputPlaceholder, autocorrectPhoneFieldValue } from "@/lib/phoneInputProps";
import { phoneIsRequiredForUser } from "@shared/lib/userProfileCompleteness";
import {
  profileEditStateFromDirectoryUser,
  type UserDirectoryProfileEditState,
} from "@shared/lib/userDirectoryProfilePatch";
import type { IUserSociumRole } from "@shared/models/userTypes";

export type { UserDirectoryProfileEditState };
export { profileEditStateFromDirectoryUser };

/** Props for {@link UserDirectoryProfileFields}. */
export interface UserDirectoryProfileFieldsProps {
  /** Current edit state. */
  value: UserDirectoryProfileEditState;
  /** Called when any field changes. */
  onChange: (next: UserDirectoryProfileEditState) => void;
  /** Read-only email when the actor can see PII; omit when redacted. */
  email?: string | null;
  /** Pending socium roles — used to surface phone requirement before save. */
  sociumRoles?: IUserSociumRole[];
  /** Server or client validation messages keyed by field name. */
  fieldErrors?: Partial<Record<keyof UserDirectoryProfileEditState, string>>;
  /** When true, inputs are disabled. */
  disabled?: boolean;
}

/**
 * Merge a current stored value into catalog options when it is not yet approved.
 *
 * @param options - Approved catalog labels.
 * @param current - Value already stored on the user document.
 * @returns Sorted unique option list.
 */
function mergeCurrentCatalogOption(options: string[], current: string): string[] {
  const trimmed = current.trim();
  if (!trimmed) return options;
  if (options.some((opt) => opt.trim().toLowerCase() === trimmed.toLowerCase())) {
    return options;
  }
  return [trimmed, ...options];
}

/**
 * Academic and contact profile editor for the User Directory admin detail pane.
 *
 * @param props - See {@link UserDirectoryProfileFieldsProps}.
 * @returns Specialty, group, email (read-only), and phone fields.
 */
export function UserDirectoryProfileFields({
  value,
  onChange,
  email,
  sociumRoles = [],
  fieldErrors,
  disabled = false,
}: UserDirectoryProfileFieldsProps) {
  const phoneRequired = phoneIsRequiredForUser({
    name: "",
    surname: null,
    phone: value.phone,
    specialty: null,
    group: null,
    sociumRoles,
  });
  const phoneHint = phoneRequired
    ? "Required while this user holds or is being assigned a self-government socium role."
    : undefined;
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/signup-options");
        if (!res.ok) throw new Error("Failed to load academic catalog options.");
        const data = (await res.json()) as { specialties?: string[]; groups?: string[] };
        if (cancelled) return;
        setSpecialtyOptions(data.specialties ?? []);
        setGroupOptions(data.groups ?? []);
        setOptionsError(null);
      } catch (err) {
        if (!cancelled) {
          setOptionsError(err instanceof Error ? err.message : "Failed to load catalog options.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const specialtySelectOptions = useMemo(
    () => mergeCurrentCatalogOption(specialtyOptions, value.specialty),
    [specialtyOptions, value.specialty],
  );

  const groupSelectOptions = useMemo(
    () => mergeCurrentCatalogOption(groupOptions, value.group),
    [groupOptions, value.group],
  );

  return (
    <div className="flex flex-col gap-6 border-b border-border pb-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Academic assignment</h3>

        {optionsError ? (
          <p className="text-xs text-destructive" role="alert">
            {optionsError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Specialty code" htmlFor="directory-specialty">
            <CreatableCatalogSelect
              id="directory-specialty"
              value={value.specialty}
              onChange={(specialty) => onChange({ ...value, specialty })}
              options={specialtySelectOptions}
              placeholder="Select or type specialty…"
              disabled={disabled}
            />
          </FormField>

          <FormField label="Group number" htmlFor="directory-group">
            <CreatableCatalogSelect
              id="directory-group"
              value={value.group}
              onChange={(group) => onChange({ ...value, group })}
              options={groupSelectOptions}
              placeholder="Select or type group…"
              disabled={disabled}
              numericOnly
            />
          </FormField>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Contact</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {email !== undefined ? (
            <FormField label="Email address" htmlFor="directory-email">
              <Input
                id="directory-email"
                type="email"
                value={email ?? ""}
                readOnly
                disabled
                className="bg-muted/40"
              />
            </FormField>
          ) : null}

          <FormField
            label="Phone number"
            htmlFor="directory-phone"
            error={fieldErrors?.phone}
            hint={phoneHint}
          >
            <Input
              id="directory-phone"
              {...phoneInputProps}
              placeholder={phoneInputPlaceholder}
              value={value.phone}
              onChange={(event) =>
                onChange({ ...value, phone: filterPhoneInputChange(event.target.value) })
              }
              onInput={(event) =>
                onChange({ ...value, phone: filterPhoneInputChange(event.currentTarget.value) })
              }
              onBlur={() => {
                const corrected = autocorrectPhoneFieldValue(value.phone);
                if (corrected !== value.phone) {
                  onChange({ ...value, phone: corrected });
                }
              }}
              disabled={disabled}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
