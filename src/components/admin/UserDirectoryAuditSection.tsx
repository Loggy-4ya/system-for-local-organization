"use client";

/**
 * @fileoverview User Directory admin audit section for the system logs page.
 *
 * @module src/components/admin/UserDirectoryAuditSection
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_AUDIT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { computePageRowRange } from "@shared/lib/listPaginationLogic";
import type { UserDirectoryAuditRow } from "@shared/domains/UserDirectoryAuditDomain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Loader2 } from "lucide-react";

/** API list response shape. */
interface AuditListResponse {
  items: UserDirectoryAuditRow[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/** Props for {@link UserDirectoryAuditSection}. */
export interface UserDirectoryAuditSectionProps {
  /** Pre-fill target user filter from deep link (`?targetUserId=`). */
  initialTargetUserId?: string;
}

/**
 * Format an ISO timestamp for display in the audit table.
 *
 * @param iso - ISO date string.
 * @returns Localized date/time label.
 */
function formatAuditTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

/**
 * Map audit action to a readable label.
 *
 * @param action - Stored action key.
 * @param t - User directory audit translator.
 * @returns Display label.
 */
function formatActionLabel(
  action: UserDirectoryAuditRow["action"],
  t: ReturnType<typeof useTranslations<"admin.systemLogs.userDirectory">>,
): string {
  if (action === "user_delete") return t("actionDelete");
  return t("actionUpdate");
}

/**
 * User Directory admin mutation audit list — embedded section on `/admin/logs`.
 *
 * @param props - Optional deep-link filter.
 * @returns User directory audit section JSX.
 */
export function UserDirectoryAuditSection({
  initialTargetUserId = "",
}: UserDirectoryAuditSectionProps) {
  const t = useTranslations("admin.systemLogs");
  const tUser = useTranslations("admin.systemLogs.userDirectory");
  const [items, setItems] = useState<UserDirectoryAuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [targetFilter, setTargetFilter] = useState(initialTargetUserId);
  const [appliedTargetFilter, setAppliedTargetFilter] = useState(initialTargetUserId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAudits = useCallback(async (pageNum: number, targetUserId: string) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(DEFAULT_AUDIT_LIST_PAGE_SIZE),
    });
    if (targetUserId.trim()) {
      params.set("targetUserId", targetUserId.trim());
    }

    const response = await fetch(`/api/admin/user-directory-audits?${params}`);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || t("loadFailed"));
    }

    const data = (await response.json()) as AuditListResponse;

    setItems(data.items);
    setPage(data.page ?? pageNum);
    setTotalPages(data.totalPages ?? 1);
    setTotalCount(data.totalCount ?? 0);
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchAudits(page, appliedTargetFilter);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadFailed"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAudits, page, appliedTargetFilter]);

  const handleApplyFilter = () => {
    setAppliedTargetFilter(targetFilter);
    setExpandedId(null);
    setPage(1);
  };

  const paginationSummary = useMemo(() => {
    const { from, to } = computePageRowRange(page, DEFAULT_AUDIT_LIST_PAGE_SIZE, totalCount);
    if (totalCount <= 0) return undefined;
    return t("paginationSummary", { from, to, total: totalCount });
  }, [page, totalCount, t]);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
        {tUser("description")}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor="user-audit-target-filter"
            className="text-xs font-medium text-(--color-text-secondary)"
          >
            {tUser("targetFilterLabel")}
          </label>
          <Input
            id="user-audit-target-filter"
            value={targetFilter}
            onChange={(event) => setTargetFilter(event.target.value)}
            placeholder={tUser("targetPlaceholder")}
          />
        </div>
        <Button type="button" variant="secondary" onClick={handleApplyFilter}>
          {t("applyFilter")}
        </Button>
      </div>

      {error ? (
        <div
          className="glass-panel rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className="glass-panel overflow-hidden rounded-lg border border-zinc-700/20 shadow-md dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-(--color-text-secondary)">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("loadingAudit")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-(--color-text-secondary)">
            {tUser("empty")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((row) => {
              const isExpanded = expandedId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.success ? "secondary" : "destructive"}>
                        {row.success ? tUser("success") : tUser("rejected")}
                      </Badge>
                      <Badge variant="outline">{formatActionLabel(row.action, tUser)}</Badge>
                      <span className="text-sm text-(--color-text-primary)">{row.summary}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-secondary)">
                      <span>{formatAuditTimestamp(row.createdAt)}</span>
                      {row.actorLogin ? <span>{tUser("actorLogin", { login: row.actorLogin })}</span> : null}
                      {row.targetDisplayName ? (
                        <span>{tUser("targetName", { name: row.targetDisplayName })}</span>
                      ) : (
                        <span className="font-mono">{tUser("targetId", { id: row.targetUserId })}</span>
                      )}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-border bg-muted/20 px-5 py-4">
                      <dl className="grid gap-3 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-(--color-text-secondary)">{tUser("actorId")}</dt>
                          <dd className="font-mono text-(--color-text-primary)">{row.actorUserId}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-(--color-text-secondary)">{tUser("targetIdLabel")}</dt>
                          <dd className="font-mono text-(--color-text-primary)">{row.targetUserId}</dd>
                        </div>
                        {row.errorCode ? (
                          <div>
                            <dt className="font-medium text-(--color-text-secondary)">{tUser("errorCode")}</dt>
                            <dd className="font-mono text-destructive">{row.errorCode}</dd>
                          </div>
                        ) : null}
                        <div className="sm:col-span-2">
                          <dt className="mb-1 font-medium text-(--color-text-secondary)">
                            {tUser("changedFields")}
                          </dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {row.changedFields.length > 0 ? (
                              row.changedFields.map((field) => (
                                <Badge key={field} variant="outline">
                                  {field}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-(--color-text-secondary)">{tUser("none")}</span>
                            )}
                          </dd>
                        </div>
                        {Object.keys(row.metadata).length > 0 ? (
                          <div className="sm:col-span-2">
                            <dt className="mb-1 font-medium text-(--color-text-secondary)">
                              {tUser("metadata")}
                            </dt>
                            <dd>
                              <pre className="overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] text-(--color-text-primary)">
                                {JSON.stringify(row.metadata, null, 2)}
                              </pre>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border p-4">
          <NexusListPagination
            page={page}
            totalPages={totalPages}
            summary={paginationSummary}
            disabled={isLoading}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
