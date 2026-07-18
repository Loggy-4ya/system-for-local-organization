"use client";

/**
 * @fileoverview Self-government membership application page for authenticated users.
 *
 * @module src/components/profile/ProfileMembershipApplicationShell
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, UserCheck } from "lucide-react";
import type { MembershipApplicationStatusDto } from "@shared/domains/MembershipApplicationDomain";
import {
  membershipApplicationRequirementsCopy,
  missingProfileFieldsInlineCopy,
} from "@/lib/profileCompletenessCopy";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";

/**
 * Membership application workflow at `/profile/membership`.
 *
 * @returns Application page JSX.
 */
export function ProfileMembershipApplicationShell() {
  const t = useTranslations("profile.membership");
  const tCommon = useTranslations("common");
  const tComplete = useTranslations("profile.completeness");
  const [status, setStatus] = useState<MembershipApplicationStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/membership-application");
    if (res.ok) {
      setStatus(await res.json());
    } else {
      setError(t("loadError"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/membership-application", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(data);
      setMessage(
        status?.isTeacherApplicant ? t("submitTeacherSuccess") : t("submitSuccess"),
      );
    } else {
      setError(typeof data.error === "string" ? data.error : t("submitError"));
    }
    setSubmitting(false);
  };

  const handleWithdraw = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/membership-application", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(data);
      setMessage(t("withdrawSuccess"));
    } else {
      setError(typeof data.error === "string" ? data.error : t("withdrawError"));
    }
    setSubmitting(false);
  };

  const isTeacherApplicant = status?.isTeacherApplicant ?? false;

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
      className="items-center p-6"
    >
      <div className="glass-panel flex w-full flex-col gap-5 rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/profile"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "mb-2 -ml-2 inline-flex gap-1.5",
              )}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t("backToProfile")}
            </Link>
            <div className="flex items-center gap-2 text-primary">
              <UserCheck size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {isTeacherApplicant ? t("teacherEyebrow") : t("membershipEyebrow")}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {isTeacherApplicant ? t("teacherTitle") : t("membershipTitle")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              {isTeacherApplicant ? t("teacherDescription") : t("membershipDescription")}
            </p>
          </div>
          <Link
            href="/profile/settings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("editProfile")}
          </Link>
        </div>

        {error ? <FormAlert variant="destructive">{error}</FormAlert> : null}
        {message ? <FormAlert variant="success">{message}</FormAlert> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">{tCommon("loading")}</p>
        ) : status?.isMember ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="font-medium text-[var(--color-text-primary)]">{t("alreadyMemberTitle")}</p>
            <p className="mt-1">{t("alreadyMemberBody")}</p>
          </section>
        ) : isTeacherApplicant && status?.teacherAccessApproved ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="font-medium text-[var(--color-text-primary)]">{t("teacherApprovedTitle")}</p>
            <p className="mt-1">{t("teacherApprovedBody")}</p>
          </section>
        ) : (
          <>
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-sm text-[var(--color-text-secondary)]">
              <p>
                {isTeacherApplicant
                  ? tComplete("teacherRequirements")
                  : membershipApplicationRequirementsCopy(tComplete, {
                      name: "",
                      surname: null,
                      phone: null,
                      specialty: null,
                      group: null,
                      avatar: null,
                      sociumRoles: status?.isTeacherApplicant
                        ? [{ roleKey: "teacher", roleLabel: "Teacher", kind: "teacher", source: "self", assignedAt: new Date() }]
                        : [],
                    })}
              </p>
              {!isTeacherApplicant ? (
                <p className="mt-2 text-xs">{tComplete("telegramAdvisory")}</p>
              ) : null}
              {!status?.readyForSubmission && (status?.missingFields?.length ?? 0) > 0 ? (
                <p className="mt-2">
                  {t("stillMissing")}{" "}
                  <span className="text-[var(--color-text-primary)]">
                    {missingProfileFieldsInlineCopy(tComplete, status?.missingFields ?? [])}
                  </span>
                  .
                </p>
              ) : null}
            </section>

            {status?.hasActiveApplication ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--color-accent-user)]/40 p-4">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t("pendingTitle")}</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("pendingBody")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={submitting}
                  onClick={() => void handleWithdraw()}
                >
                  {t("withdraw")}
                </Button>
              </section>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting || !status?.readyForSubmission}
                  onClick={() => void handleSubmit()}
                >
                  {t("submit")}
                </Button>
                {!status?.readyForSubmission ? (
                  <p className="self-center text-xs text-[var(--color-text-secondary)]">
                    {t("completeProfileHint")}
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </StaticPageShell>
  );
}

export default ProfileMembershipApplicationShell;
