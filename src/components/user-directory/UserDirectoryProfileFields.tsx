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
import { filterPhoneInputChange, phoneInputProps } from "@/lib/phoneInputProps";

/** Editable profile fields for directory admin mutations. */
export interface UserDirectoryProfileEditState {
  specialty: string;
  group: string;
  phone: string;
}

/** Props for {@link UserDirectoryProfileFields}. */
export interface UserDirectoryProfileFieldsProps {
  /** Current edit state. */
  value: UserDirectoryProfileEditState;
  /** Called when any field changes. */
  onChange: (next: UserDirectoryProfileEditState) => void;
  /** Read-only email when the actor can see PII; omit when redacted. */
  email?: string | null;
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
  disabled = false,
}: UserDirectoryProfileFieldsProps) {
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

          <FormField label="Phone number" htmlFor="directory-phone">
            <Input
              id="directory-phone"
              {...phoneInputProps}
              placeholder="+380 XX XXX XX XX"
              value={value.phone}
              onChange={(event) =>
                onChange({ ...value, phone: filterPhoneInputChange(event.target.value) })
              }
              disabled={disabled}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

/**
 * Build edit state from a directory detail row.
 *
 * @param user - Selected directory user row.
 * @returns Initial specialty, group, and phone edit state.
 */
export function profileEditStateFromDirectoryUser(user: {
  specialty: string | null;
  group: string | null;
  phone: string | null;
}): UserDirectoryProfileEditState {
  return {
    specialty: user.specialty ?? "",
    group: user.group ?? "",
    phone: user.phone ?? "",
  };
}

/**
 * Build a profile PATCH containing only fields the admin actually changed.
 *
 * Avoids re-submitting legacy specialty/group strings that fail current validators
 * when saving unrelated access-control updates.
 *
 * @param edit - Current form state.
 * @param baseline - Snapshot from the loaded directory row.
 * @returns Partial profile patch (may be empty).
 */
export function buildProfilePatchDelta(
  edit: UserDirectoryProfileEditState,
  baseline: UserDirectoryProfileEditState,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  const editSpecialty = edit.specialty.trim();
  const baseSpecialty = baseline.specialty.trim();
  if (editSpecialty !== baseSpecialty) {
    patch.specialty = editSpecialty || null;
  }

  const editGroup = edit.group.trim();
  const baseGroup = baseline.group.trim();
  if (editGroup !== baseGroup) {
    patch.group = editGroup || null;
  }

  const editPhone = edit.phone.trim();
  const basePhone = baseline.phone.trim();
  if (editPhone !== basePhone) {
    patch.phone = editPhone || null;
  }

  return patch;
}
