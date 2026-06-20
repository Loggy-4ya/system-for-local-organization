/**
 * @fileoverview Client-side profile settings form for /profile/settings.
 *
 * @module src/components/profile/ProfileSettingsForm
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { AccentFamily, AccentShade, IUserSocialLink, StudentTitle } from "@shared/models/User";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import { formatAccentLabel } from "@/lib/accentTokens";
import { clientProfileSettingsSchema } from "@shared/validation/profileSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { uploadMediaFile } from "@/lib/mediaUploadClient";
import { phoneIsRequiredForUser } from "@shared/lib/userProfileCompleteness";

/** Props for {@link ProfileSettingsForm}. */
export interface ProfileSettingsFormProps {
  user: PublicUser;
  /** When true, enforces OAuth onboarding required fields and consent. */
  onboardingMode?: boolean;
}

const FAMILIES: AccentFamily[] = ["blue", "red", "yellow", "green", "purple"];
const SHADES: AccentShade[] = ["soft", "medium", "strong"];

/**
 * Editable profile settings form.
 *
 * @param props - Initial user data from server.
 * @returns Settings form JSX.
 */
export function ProfileSettingsForm({ user, onboardingMode = false }: ProfileSettingsFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [specialty, setSpecialty] = useState(user.specialty ?? "");
  const [group, setGroup] = useState(user.group ?? "");
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>(user.studentTitle);
  const [about, setAbout] = useState(user.about ?? "");
  const [socialLinks, setSocialLinks] = useState<IUserSocialLink[]>(user.socialLinks ?? []);
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [accentFamily, setAccentFamily] = useState<AccentFamily>(user.accentFamily);
  const [accentShade, setAccentShade] = useState<AccentShade>(user.accentShade);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [personalDataConsent, setPersonalDataConsent] = useState(
    Boolean(user.personalDataConsentAt),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const hasPassword = Boolean(user.login) && !user.googleId && !user.appleId;
  const canChangePassword = hasPassword;
  const canUnlinkTelegram =
    Boolean(user.telegramId) &&
    Boolean(user.googleId || user.appleId || user.login);

  const phoneRequired =
    onboardingMode ||
    phoneIsRequiredForUser({
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      sociumRoles: user.sociumRoles,
    });

  /**
   * Upload avatar image via authenticated upload API.
   *
   * @param e - File input change event.
   */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const url = await uploadMediaFile(file, {
        accept: "image",
        purpose: "avatar",
        ownerKey: user.id,
      });
      setAvatar(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      e.target.value = "";
    }
  }

  /**
   * Unlink Telegram from the authenticated account.
   */
  async function handleUnlinkTelegram() {
    if (!window.confirm("Unlink Telegram from this Nexus account?")) return;

    setError(null);
    setSuccess(null);
    setUnlinkLoading(true);

    try {
      const res = await fetch("/api/profile/telegram", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to unlink Telegram.");

      setSuccess("Telegram unlinked successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink Telegram.");
    } finally {
      setUnlinkLoading(false);
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
      surname: surname || null,
      phone: phone || null,
      specialty: specialty || null,
      group: group || null,
      studentTitle,
      about: about || null,
      socialLinks: socialLinks.filter((link) => link.url.trim().length > 0),
      avatar: avatar || null,
      accentFamily,
      accentShade,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
      completeOAuthOnboarding: onboardingMode || undefined,
      personalDataConsent: onboardingMode ? personalDataConsent : undefined,
    };

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
        surname: result.data.surname,
        phone: result.data.phone,
        specialty: result.data.specialty,
        group: result.data.group,
        studentTitle: result.data.studentTitle,
        about: result.data.about,
        socialLinks: result.data.socialLinks,
        avatar: result.data.avatar,
        accentFamily: result.data.accentFamily,
        accentShade: result.data.accentShade,
      };

      if (onboardingMode) {
        body.completeOAuthOnboarding = true;
        body.personalDataConsent = personalDataConsent;
      }

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

      if (onboardingMode && data.onboardingComplete) {
        router.push("/profile");
        router.refresh();
        return;
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
          label="First name"
          htmlFor="settings-name"
          error={fieldErrors.name}
        >
          <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>

        <FormField
          label="Surname"
          htmlFor="settings-surname"
          error={fieldErrors.surname}
        >
          <Input
            id="settings-surname"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            required={onboardingMode}
          />
        </FormField>

        <FormField
          label={phoneRequired ? "Phone number" : "Phone number (recommended)"}
          htmlFor="settings-phone"
          error={fieldErrors.phone}
          hint={
            phoneRequired
              ? onboardingMode
                ? "Required to complete your profile."
                : "Required for self-government members."
              : "Strongly recommended — required when applying for self-government membership."
          }
        >
          <Input
            id="settings-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+380 XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required={phoneRequired}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Login</span>
          <Input id="settings-login" value={user.login ?? ""} disabled />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Linked email</span>
          <Input
            id="settings-email"
            value={user.email ?? ""}
            disabled
            placeholder="No email linked"
          />
          <p className="text-xs text-(--color-text-secondary)">
            Optional contact email for OAuth merge — not used for sign-in.
          </p>
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
            required={onboardingMode}
          />
        </FormField>

        <FormField
          label="Group"
          htmlFor="settings-group"
          error={fieldErrors.group}
        >
          <Input
            id="settings-group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            required={onboardingMode}
          />
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

        <FormField
          label="About you"
          htmlFor="settings-about"
          error={fieldErrors.about}
        >
          <textarea
            id="settings-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-text-primary)"
            placeholder="Short bio visible on your profile"
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--color-text-primary)">Social links</span>
          {socialLinks.map((link, index) => (
            <div key={`social-link-${index}`} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-(--color-border-default) p-3">
              <FormField label="Platform" htmlFor={`social-platform-${index}`}>
                <Input
                  id={`social-platform-${index}`}
                  value={link.platform}
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...next[index], platform: e.target.value };
                    setSocialLinks(next);
                  }}
                />
              </FormField>
              <FormField label="URL" htmlFor={`social-url-${index}`} error={fieldErrors[`socialLinks.${index}.url`]}>
                <Input
                  id={`social-url-${index}`}
                  value={link.url}
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...next[index], url: e.target.value };
                    setSocialLinks(next);
                  }}
                />
              </FormField>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
              >
                Remove link
              </Button>
            </div>
          ))}
          {socialLinks.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                setSocialLinks([...socialLinks, { platform: "custom", label: null, url: "" }])
              }
            >
              Add social link
            </Button>
          )}
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

      {onboardingMode && (
        <section className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-(--color-text-secondary)">
            <input
              type="checkbox"
              checked={personalDataConsent}
              onChange={(e) => setPersonalDataConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
              aria-invalid={Boolean(fieldErrors.personalDataConsent)}
            />
            <span>
              I consent to the processing of my personal data in accordance with institutional
              policy.
            </span>
          </label>
          {fieldErrors.personalDataConsent && (
            <p className="text-xs text-destructive">{fieldErrors.personalDataConsent}</p>
          )}
        </section>
      )}

      {!onboardingMode && (
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">Connected accounts</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-(--color-text-secondary)">
          <li>Google: {user.googleId ? "Linked" : "Not linked"}</li>
          <li>Apple: {user.appleId ? "Linked" : "Not linked"}</li>
          <li>Telegram: {user.telegramId ? `Linked (@${user.username ?? user.telegramId})` : "Not linked"}</li>
        </ul>
        {canUnlinkTelegram && (
          <Button
            type="button"
            variant="outline"
            disabled={unlinkLoading}
            onClick={handleUnlinkTelegram}
            className="w-full md:w-auto"
          >
            {unlinkLoading ? "Unlinking…" : "Unlink Telegram"}
          </Button>
        )}
        {user.telegramId && !canUnlinkTelegram && (
          <p className="text-xs text-(--color-text-secondary)">
            Set a password or link Google/Apple before unlinking Telegram.
          </p>
        )}
        {!user.googleId && (
          <p className="text-xs text-(--color-text-secondary)">
            Link Google to add your verified email address to this account.
          </p>
        )}
        <OAuthButtonRow callbackUrl="/profile/settings" linkUserId={user.id} />
      </section>
      )}

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
        {loading ? "Saving…" : onboardingMode ? "Save and continue" : "Save changes"}
      </Button>
    </form>
  );
}

export default ProfileSettingsForm;
