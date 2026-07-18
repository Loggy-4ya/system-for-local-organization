/**
 * @fileoverview Client-side profile settings form for /profile/settings.
 *
 * @module src/components/profile/ProfileSettingsForm
 */

"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { BotLocale } from "@shared/constants/botLocales";
import { isBotLocale } from "@shared/lib/resolveBotLocale";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { IUserSocialLink, StudentTitle } from "@shared/models/User";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import { clientProfileSettingsSchema } from "@shared/validation/profileSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { memberProfileMaintenanceCopy } from "@/lib/profileCompletenessCopy";
import { phoneIsRequiredForUser, avatarIsRequiredForUser, telegramIsRequiredForUser } from "@shared/lib/userProfileCompleteness";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";
import { useContentPolicyFields } from "@/lib/useContentPolicyField";
import { filterPhoneInputChange, phoneInputProps, phoneInputPlaceholder, autocorrectPhoneFieldValue } from "@/lib/phoneInputProps";
import { AvatarImageField } from "@/components/media/AvatarImageField";
import { useOptionalSiteProfile } from "@/components/auth/SiteProfileProvider";
import { TaskChannelToggleGroup } from "@/components/tasks/TaskChannelToggleGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  USER_NOTIFICATION_TELEGRAM_LINK_HINT,
} from "@shared/constants/userNotificationSettings";
import { normalizeUserNotificationChannels } from "@shared/lib/userNotificationSettingsLogic";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";

/** Props for {@link ProfileSettingsForm}. */
export interface ProfileSettingsFormProps {
  user: PublicUser;
  /** When true, enforces OAuth onboarding required fields and consent. */
  onboardingMode?: boolean;
  /** When true, enforces teacher application fields (no specialty/group). */
  teacherOnboardingMode?: boolean;
  /** When true, member must link Telegram before using member tools. */
  memberTelegramOnboardingMode?: boolean;
}

/**
 * Editable profile settings form.
 *
 * @param props - Initial user data from server.
 * @returns Settings form JSX.
 */
export function ProfileSettingsForm({
  user,
  onboardingMode = false,
  teacherOnboardingMode = false,
  memberTelegramOnboardingMode = false,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const siteProfile = useOptionalSiteProfile();
  const appLocale = useLocale();
  const tSettings = useTranslations("profile.settingsForm");
  const tComplete = useTranslations("profile.completeness");
  const tLocale = useTranslations("common.locale");
  const isTeacher = isTeacherUser(user.sociumRoles);
  const profileSlice = {
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles,
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
    teacherAccessApproved: user.teacherAccessApproved,
  };
  const memberProfileHint = memberProfileMaintenanceCopy(tComplete, profileSlice);

  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [specialty, setSpecialty] = useState(user.specialty ?? "");
  const [group, setGroup] = useState(user.group ?? "");
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>(user.studentTitle);
  const [about, setAbout] = useState(user.about ?? "");
  const [socialLinks, setSocialLinks] = useState<IUserSocialLink[]>(user.socialLinks ?? []);
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [notificationChannels, setNotificationChannels] = useState<TaskReminderChannel[]>(
    normalizeUserNotificationChannels(user.notificationChannels),
  );
  const [preferredLocale, setPreferredLocale] = useState<BotLocale>(() => {
    if (user.preferredLocale && isBotLocale(user.preferredLocale)) {
      return user.preferredLocale;
    }
    return isBotLocale(appLocale) ? appLocale : "en";
  });
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
  const { validateField, fieldError, clearLiveErrors } = useContentPolicyFields();

  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const hasPassword = Boolean(user.login) && !user.googleId;
  const canChangePassword = hasPassword;
  const canUnlinkTelegram =
    Boolean(user.telegramId) &&
    Boolean(user.googleId || user.login) &&
    !telegramIsRequiredForUser({
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      avatar: user.avatar,
      sociumRoles: user.sociumRoles,
      selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
      telegramId: user.telegramId,
    });

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

  const avatarRequired = avatarIsRequiredForUser({
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles,
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
  });

  const telegramRequired = telegramIsRequiredForUser({
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles,
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
  });

  const showMemberTelegramConnect =
    (memberTelegramOnboardingMode || (telegramRequired && !user.telegramId)) && !onboardingMode;

  const membershipProfileRequired = avatarRequired || phoneRequired || telegramRequired;

  /**
   * Unlink Telegram from the authenticated account.
   */
  async function handleUnlinkTelegram() {
    if (!window.confirm(tSettings("unlinkConfirm"))) return;

    setError(null);
    setSuccess(null);
    setUnlinkLoading(true);

    try {
      const res = await fetch("/api/profile/telegram", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tSettings("unlinkFailed"));

      setSuccess(tSettings("unlinkSuccess"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tSettings("unlinkFailed"));
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
    clearLiveErrors();

    if (avatarRequired && !avatar.trim()) {
      setFieldErrors({ avatar: tSettings("photoRequired") });
      setError(tSettings("photoRequired"));
      return;
    }

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
      notificationChannels,
      preferredLocale,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
      completeOAuthOnboarding: onboardingMode || undefined,
      personalDataConsent: onboardingMode ? personalDataConsent : undefined,
    };

    const result = clientProfileSettingsSchema.safeParse(payload);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setError(formatted.formError || tSettings("validationErrors"));
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
        notificationChannels: result.data.notificationChannels,
        preferredLocale: result.data.preferredLocale,
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
        throw new Error(data.error ?? tSettings("updateFailed"));
      }

      if (onboardingMode && data.onboardingComplete) {
        await siteProfile?.refreshProfile();
        const nextLocale =
          result.data.preferredLocale && isBotLocale(result.data.preferredLocale)
            ? result.data.preferredLocale
            : appLocale;
        router.push("/profile", { locale: nextLocale });
        router.refresh();
        return;
      }

      const savedLocale = result.data.preferredLocale;
      await siteProfile?.refreshProfile();

      if (savedLocale && isBotLocale(savedLocale) && savedLocale !== appLocale) {
        router.replace(pathname, { locale: savedLocale });
        return;
      }

      setSuccess(tSettings("saved"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      clearLiveErrors();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tSettings("updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("personalInfoTitle")}</h2>

        <FormField
          label={tSettings("firstName")}
          htmlFor="settings-name"
          error={fieldError("name", fieldErrors.name)}
        >
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateField("name", name, "plain-text")}
            required
          />
        </FormField>

        <FormField
          label={tSettings("surname")}
          htmlFor="settings-surname"
          error={fieldError("surname", fieldErrors.surname)}
          hint={membershipProfileRequired ? memberProfileHint : undefined}
        >
          <Input
            id="settings-surname"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            onBlur={() => validateField("surname", surname, "plain-text")}
            required={onboardingMode}
          />
        </FormField>

        <FormField
          label={tSettings("phoneNumber")}
          htmlFor="settings-phone"
          error={fieldErrors.phone}
          hint={
            membershipProfileRequired
              ? memberProfileHint
              : isTeacher
                ? tComplete("teacherFieldHint")
              : tSettings("phoneOptionalHint")
          }
        >
          <Input
            id="settings-phone"
            {...phoneInputProps}
            placeholder={phoneInputPlaceholder}
            value={phone}
            onChange={(e) => setPhone(filterPhoneInputChange(e.target.value))}
            onBlur={() => {
              const corrected = autocorrectPhoneFieldValue(phone);
              if (corrected !== phone) setPhone(corrected);
            }}
            required={membershipProfileRequired || onboardingMode}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">{tSettings("login")}</span>
          <Input id="settings-login" value={user.login ?? ""} disabled />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">{tSettings("linkedEmail")}</span>
          <Input
            id="settings-email"
            value={user.email ?? ""}
            disabled
            placeholder={tSettings("noEmailLinked")}
          />
          <p className="text-xs text-(--color-text-secondary)">
            {tSettings("linkedEmailHint")}
          </p>
        </div>

        {!isTeacher ? (
          <>
            <FormField
              label={tSettings("specialty")}
              htmlFor="settings-specialty"
              error={fieldErrors.specialty}
              hint={membershipProfileRequired ? memberProfileHint : undefined}
            >
              <Input
                id="settings-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required={onboardingMode && !teacherOnboardingMode}
              />
            </FormField>

            <FormField
              label={tSettings("group")}
              htmlFor="settings-group"
              error={fieldErrors.group}
              hint={membershipProfileRequired ? memberProfileHint : undefined}
            >
              <Input
                id="settings-group"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={group}
                onChange={(e) => setGroup(e.target.value.replace(/\D/g, ""))}
                required={onboardingMode && !teacherOnboardingMode}
              />
            </FormField>
          </>
        ) : null}

        {!isTeacher ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-(--color-text-primary)">{tSettings("studentTitle")}</span>
            <RoleChipGroup
              value={studentTitle}
              onChange={(v) => setStudentTitle(v)}
            />
          </div>
        ) : null}

        <FormField
          label={tSettings("profilePhoto")}
          htmlFor="settings-avatar-file"
          error={fieldErrors.avatar}
          hint={
            membershipProfileRequired
              ? memberProfileHint
              : tSettings("profilePhotoHint")
          }
        >
          <AvatarImageField
            id="settings-avatar-file"
            value={avatar}
            onChange={setAvatar}
            ownerKey={user.id}
          />
        </FormField>

        <FormField
          label={tSettings("aboutYou")}
          htmlFor="settings-about"
          error={fieldError("about", fieldErrors.about)}
        >
          <textarea
            id="settings-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={() => validateField("about", about, "plain-text")}
            rows={4}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-text-primary)"
            placeholder={tSettings("aboutPlaceholder")}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--color-text-primary)">{tSettings("socialLinks")}</span>
          {socialLinks.map((link, index) => (
            <div key={`social-link-${index}`} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-(--color-border-default) p-3">
              <FormField label={tSettings("platform")} htmlFor={`social-platform-${index}`}>
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
              <FormField label={tSettings("url")} htmlFor={`social-url-${index}`} error={fieldErrors[`socialLinks.${index}.url`]}>
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
                {tSettings("removeLink")}
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
              {tSettings("addSocialLink")}
            </Button>
          )}
        </div>
      </section>

      {canChangePassword && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("passwordTitle")}</h2>
          
          <FormField
            label={tSettings("currentPassword")}
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
            label={tSettings("newPassword")}
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
            label={tSettings("confirmPassword")}
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

      {onboardingMode && telegramRequired && !user.telegramId ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("telegramTitle")}</h2>
          <p className="text-sm text-(--color-text-secondary)">
            {tComplete("memberProfileHintShort")}
          </p>
          <OAuthButtonRow callbackUrl="/profile/settings?onboarding=1" linkUserId={user.id} />
        </section>
      ) : null}

      {showMemberTelegramConnect ? (
        <section className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-accent-warning,#f59e0b)]/40 p-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("telegramRequiredTitle")}</h2>
          <p className="text-sm text-(--color-text-secondary)">
            {tComplete("memberTelegramRequired")}
          </p>
          <OAuthButtonRow
            callbackUrl="/profile/settings?onboarding=member-telegram"
            linkUserId={user.id}
          />
        </section>
      ) : null}

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
              {tSettings("consentLabel")}
            </span>
          </label>
          {fieldErrors.personalDataConsent && (
            <p className="text-xs text-destructive">{fieldErrors.personalDataConsent}</p>
          )}
        </section>
      )}

      {!onboardingMode && (
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("languageTitle")}</h2>
        <p className="text-sm text-(--color-text-secondary)">{tSettings("languageHint")}</p>
        <FormField label={tSettings("languageLabel")} htmlFor="settings-preferred-locale">
          <Select
            value={preferredLocale}
            onValueChange={(value) => {
              if (typeof value === "string" && isBotLocale(value)) {
                setPreferredLocale(value);
              }
            }}
          >
            <SelectTrigger id="settings-preferred-locale" className="w-full md:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{tLocale("en")}</SelectItem>
              <SelectItem value="uk">{tLocale("uk")}</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </section>
      )}

      {!onboardingMode && (
      <section id="notifications" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("notificationsTitle")}</h2>
        <p className="text-sm text-(--color-text-secondary)">{tComplete("notificationChannelsHint")}</p>
        <TaskChannelToggleGroup
          value={notificationChannels}
          onChange={setNotificationChannels}
        />
        {!user.telegramId && notificationChannels.includes("telegram") && (
          <div className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <span className="text-(--color-text-secondary)">{tSettings("telegramNotLinkedBanner")}</span>
            <a
              href="#connected-accounts"
              className="ml-auto shrink-0 font-medium text-(--color-accent-user) underline-offset-2 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("connected-accounts")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {tSettings("linkTelegramNow")}
            </a>
          </div>
        )}
      </section>
      )}

      {!onboardingMode && (
      <section id="connected-accounts" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-(--color-text-primary)">{tSettings("connectedAccountsTitle")}</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-(--color-text-secondary)">
          <li>Google: {user.googleId ? tSettings("googleLinked") : tSettings("googleNotLinked")}</li>
          <li>
            Telegram:{" "}
            {user.telegramId
              ? tSettings("telegramLinked", { username: user.username ?? String(user.telegramId) })
              : tSettings("telegramNotLinked")}
          </li>
        </ul>
        {canUnlinkTelegram && (
          <Button
            type="button"
            variant="outline"
            disabled={unlinkLoading}
            onClick={handleUnlinkTelegram}
            className="w-full md:w-auto"
          >
            {unlinkLoading ? tSettings("unlinking") : tSettings("unlinkTelegram")}
          </Button>
        )}
        {user.telegramId && !canUnlinkTelegram && (
          <p className="text-xs text-(--color-text-secondary)">
            {telegramIsRequiredForUser({
              name: user.name,
              surname: user.surname,
              phone: user.phone,
              specialty: user.specialty,
              group: user.group,
              avatar: user.avatar,
              sociumRoles: user.sociumRoles,
              selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
              telegramId: user.telegramId,
            })
              ? tSettings("telegramRequiredForMembers")
              : tSettings("unlinkTelegramHint")}
          </p>
        )}
        {!user.telegramId && !showMemberTelegramConnect && (
          <p className="text-xs text-(--color-text-secondary)">
            {tSettings("linkTelegramWidgetHint")}
          </p>
        )}
        {!showMemberTelegramConnect ? (
          <OAuthButtonRow callbackUrl="/profile/settings" linkUserId={user.id} />
        ) : null}
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
        {loading ? tSettings("saving") : onboardingMode ? tSettings("saveAndContinue") : memberTelegramOnboardingMode ? tSettings("saveProfile") : tSettings("saveChanges")}
      </Button>
    </form>
  );
}

export default ProfileSettingsForm;
