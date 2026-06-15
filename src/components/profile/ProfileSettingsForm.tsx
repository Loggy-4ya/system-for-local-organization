/**
 * @fileoverview Client-side profile settings form for /profile/settings.
 *
 * @module src/components/profile/ProfileSettingsForm
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { AccentFamily, AccentShade, StudentTitle } from "@shared/models/User";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import { formatAccentLabel } from "@/lib/accentTokens";
import { clientProfileSettingsSchema } from "@shared/validation/profileSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";

/** Props for {@link ProfileSettingsForm}. */
export interface ProfileSettingsFormProps {
  user: PublicUser;
}

const FAMILIES: AccentFamily[] = ["blue", "red", "yellow", "green", "purple"];
const SHADES: AccentShade[] = ["soft", "medium", "strong"];

/**
 * Editable profile settings form.
 *
 * @param props - Initial user data from server.
 * @returns Settings form JSX.
 */
export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [specialty, setSpecialty] = useState(user.specialty ?? "");
  const [group, setGroup] = useState(user.group ?? "");
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>(user.studentTitle);
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [accentFamily, setAccentFamily] = useState<AccentFamily>(user.accentFamily);
  const [accentShade, setAccentShade] = useState<AccentShade>(user.accentShade);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const hasPassword = Boolean(user.email) && !user.googleId && !user.appleId;
  const canChangePassword = hasPassword || user.email;

  /**
   * Upload avatar image via authenticated upload API.
   *
   * @param e - File input change event.
   */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok && data.url) {
      setAvatar(data.url);
    }
  }

  /**
   * Submit profile PATCH to API.
   *
   * @param e - Form submit event.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const payload = {
      name,
      specialty: specialty || null,
      group: group || null,
      studentTitle,
      avatar: avatar || null,
      accentFamily,
      accentShade,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
    };

    // Client-side Zod validation
    const result = clientProfileSettingsSchema.safeParse(payload);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: result.data.name,
        specialty: result.data.specialty,
        group: result.data.group,
        studentTitle: result.data.studentTitle,
        avatar: result.data.avatar,
        accentFamily: result.data.accentFamily,
        accentShade: result.data.accentShade,
      };

      if (result.data.newPassword) {
        body.currentPassword = result.data.currentPassword;
        body.newPassword = result.data.newPassword;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        throw new Error(data.error ?? "Update failed.");
      }

      setSuccess("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">Personal info</h2>

        <FormField
          label="Display name"
          htmlFor="settings-name"
          error={fieldErrors.name}
        >
          <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Email</span>
          <Input id="settings-email" value={user.email ?? ""} disabled />
        </div>

        <FormField
          label="Specialty"
          htmlFor="settings-specialty"
          error={fieldErrors.specialty}
        >
          <Input
            id="settings-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </FormField>

        <FormField
          label="Group"
          htmlFor="settings-group"
          error={fieldErrors.group}
        >
          <Input id="settings-group" value={group} onChange={(e) => setGroup(e.target.value)} />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Student title</span>
          <RoleChipGroup
            value={studentTitle}
            onChange={(v) => setStudentTitle(v)}
          />
        </div>

        <FormField
          label="Avatar URL"
          htmlFor="settings-avatar"
          error={fieldErrors.avatar}
        >
          <Input id="settings-avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Upload Avatar</span>
          <Input id="settings-avatar-file" type="file" accept="image/*" onChange={handleAvatarUpload} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">Accent</h2>
        <p className="text-sm text-(--color-text-secondary)">
          Preview: {formatAccentLabel(accentFamily, accentShade)}
        </p>
        <div className="flex flex-wrap gap-2">
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAccentFamily(f)}
              className={
                accentFamily === f
                  ? "badge badge-group"
                  : "rounded-[6px] border border-(--color-border-default) px-2 py-1 text-xs capitalize text-(--color-text-secondary)"
              }
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SHADES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAccentShade(s)}
              className={
                accentShade === s
                  ? "badge badge-group"
                  : "rounded-[6px] border border-(--color-border-default) px-2 py-1 text-xs capitalize text-(--color-text-secondary)"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {canChangePassword && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">Password</h2>
          
          <FormField
            label="Current password"
            htmlFor="current-password"
            error={fieldErrors.currentPassword}
          >
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormField>

          <FormField
            label="New password"
            htmlFor="new-password"
            error={fieldErrors.newPassword}
          >
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>

          <FormField
            label="Confirm new password"
            htmlFor="confirm-password"
            error={fieldErrors.confirmPassword}
          >
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormField>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">Connected accounts</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-(--color-text-secondary)">
          <li>Google: {user.googleId ? "Linked" : "Not linked"}</li>
          <li>Apple: {user.appleId ? "Linked" : "Not linked"}</li>
          <li>Telegram: {user.telegramId ? `Linked (@${user.username ?? user.telegramId})` : "Not linked"}</li>
        </ul>
        <OAuthButtonRow callbackUrl="/profile/settings" />
      </section>

      {error && (
        <FormAlert variant="error">
          {error}
        </FormAlert>
      )}
      {success && (
        <FormAlert variant="success">
          {success}
        </FormAlert>
      )}

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export default ProfileSettingsForm;
