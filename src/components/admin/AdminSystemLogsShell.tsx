"use client";

/**
 * @fileoverview Multi-section system logs viewer for legacy administrators.
 *
 * Section selection is driven by the server page via `initialSection` (from URL
 * `?section=`) so this shell avoids `useSearchParams` and Suspense hydration issues.
 *
 * @module src/components/admin/AdminSystemLogsShell
 */

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { buttonVariants } from "@/components/ui/button";
import { SecuritySanitizeAuditSection } from "@/components/admin/SecuritySanitizeAuditSection";
import { UserDirectoryAuditSection } from "@/components/admin/UserDirectoryAuditSection";
import {
  SYSTEM_LOG_SECTION_IDS,
  type SystemLogsSectionId,
} from "@/lib/systemLogsSections";
import { cn } from "@/lib/utils";
import "@/app/global-layout-editor.css";

/** Props for {@link AdminSystemLogsShell}. */
export interface AdminSystemLogsShellProps {
  /** Active section from server `searchParams`. */
  initialSection: SystemLogsSectionId;
  /** Optional target user filter for the user-directory section. */
  initialTargetUserId?: string;
}

/**
 * Multi-section system logs page shell with link-based section tabs.
 *
 * @param props - See {@link AdminSystemLogsShellProps}.
 * @returns System logs viewer JSX.
 */
export function AdminSystemLogsShell({
  initialSection,
  initialTargetUserId,
}: AdminSystemLogsShellProps) {
  const tAdmin = useTranslations("admin");
  const t = useTranslations("admin.systemLogs");

  /** Resolve localized tab label for a section id. */
  function sectionLabel(sectionId: SystemLogsSectionId): string {
    return sectionId === "content-sanitization"
      ? t("sections.contentSanitization")
      : t("sections.userDirectory");
  }

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="global-layout-editor py-8 md:py-12"
      innerClassName="global-layout-editor__stack"
    >
      <div
        className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex flex-col gap-4">
          <Link
            href="/admin"
            className="global-layout-editor__btn-text inline-flex w-fit items-center gap-1.5 border border-zinc-700/10 text-xs text-(--color-text-secondary) no-underline transition-colors hover:bg-zinc-700/10 hover:text-(--color-text-primary) dark:border-zinc-300/5 dark:hover:bg-zinc-300/5"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            {tAdmin("backToAdmin")}
          </Link>

          <div className="flex flex-col gap-1.5">
            <div className="mb-1 flex items-center gap-2 text-primary">
              <ClipboardList size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wide uppercase">{t("eyebrow")}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
              {t("title")}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
              {t("description")}
            </p>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t("sectionsAria")}
          >
            {SYSTEM_LOG_SECTION_IDS.map((sectionId) => {
              const isActive = sectionId === initialSection;
              return (
                <Link
                  key={sectionId}
                  href={`/admin/logs?section=${sectionId}`}
                  scroll={false}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    buttonVariants({
                      variant: isActive ? "default" : "secondary",
                    }),
                    "no-underline",
                  )}
                >
                  {sectionLabel(sectionId)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
        role="tabpanel"
      >
        {initialSection === "content-sanitization" ? (
          <SecuritySanitizeAuditSection />
        ) : (
          <UserDirectoryAuditSection initialTargetUserId={initialTargetUserId} />
        )}
      </div>
    </StaticPageShell>
  );
}
