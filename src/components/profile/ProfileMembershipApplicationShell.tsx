"use client";

/**
 * @fileoverview Self-government membership application page for authenticated users.
 *
 * @module src/components/profile/ProfileMembershipApplicationShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";
import type { MembershipApplicationStatusDto } from "@shared/domains/MembershipApplicationDomain";
import { SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT } from "@shared/lib/userProfileCompleteness";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";

/**
 * Membership application workflow at `/profile/membership`.
 *
 * @returns Application page JSX.
 */
export function ProfileMembershipApplicationShell() {
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
      setError("Could not load application status.");
    }
    setLoading(false);
  }, []);

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
      setMessage("Your application has been submitted. Reviewers will be notified.");
    } else {
      setError(typeof data.error === "string" ? data.error : "Could not submit application.");
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
      setMessage("Application withdrawn.");
    } else {
      setError(typeof data.error === "string" ? data.error : "Could not withdraw application.");
    }
    setSubmitting(false);
  };

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
              Back to profile
            </Link>
            <div className="flex items-center gap-2 text-primary">
              <UserCheck size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                Self-government
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              Membership application
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              Apply to join the student self-government council. Reviewers with the appropriate
              permissions will approve your application and assign the member role.
            </p>
          </div>
          <Link
            href="/profile/settings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit profile
          </Link>
        </div>

        {error ? <FormAlert variant="destructive">{error}</FormAlert> : null}
        {message ? <FormAlert variant="success">{message}</FormAlert> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
        ) : status?.isMember ? (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="font-medium text-[var(--color-text-primary)]">
              You are already a self-government member.
            </p>
            <p className="mt-1">
              Your profile shows council roles and quality scores on the main profile page.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4 text-sm text-[var(--color-text-secondary)]">
              <p>{SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT}</p>
              {!status?.readyForSubmission && status?.missingFieldLabels.length ? (
                <p className="mt-2">
                  Still missing:{" "}
                  <span className="text-[var(--color-text-primary)]">
                    {status.missingFieldLabels.join(", ")}
                  </span>
                  .
                </p>
              ) : null}
            </section>

            {status?.hasActiveApplication ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--color-accent-user)]/40 p-4">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Application pending review
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Your application is in the queue. You may withdraw it and re-apply later if your
                  circumstances change.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={submitting}
                  onClick={() => void handleWithdraw()}
                >
                  Withdraw application
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
                  Submit application
                </Button>
                {!status?.readyForSubmission ? (
                  <p className="self-center text-xs text-[var(--color-text-secondary)]">
                    Complete your profile before submitting.
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
