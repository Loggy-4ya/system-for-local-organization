/**
 * @fileoverview Profile patch helpers for User Directory admin saves.
 *
 * @module shared/lib/userDirectoryProfilePatch
 */

import { normalizePhoneInput } from "@shared/validation/phoneSchema";

/** Editable profile fields for directory admin mutations. */
export interface UserDirectoryProfileEditState {
  specialty: string;
  group: string;
  phone: string;
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
    phone: normalizePhoneInput(user.phone) ?? "",
  };
}

/**
 * Build a profile PATCH containing only fields the admin actually changed.
 *
 * Phone deltas compare against the persisted row — not the form-open snapshot — so
 * a dialable number in the form is still sent when MongoDB has no valid phone yet.
 *
 * @param edit - Current form state.
 * @param baseline - Snapshot from when the detail pane loaded (specialty/group).
 * @param storedPhone - Phone currently persisted on the user document.
 * @returns Partial profile patch (may be empty).
 */
export function buildProfilePatchDelta(
  edit: UserDirectoryProfileEditState,
  baseline: UserDirectoryProfileEditState,
  storedPhone: string | null,
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

  const editPhone = normalizePhoneInput(edit.phone) ?? "";
  const storedNormalized = normalizePhoneInput(storedPhone) ?? "";
  if (editPhone !== storedNormalized) {
    patch.phone = editPhone || null;
  }

  return patch;
}
