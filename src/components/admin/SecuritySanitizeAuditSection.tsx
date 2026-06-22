"use client";

/**
 * @fileoverview Content sanitization audit section for the system logs page.
 *
 * @module src/components/admin/SecuritySanitizeAuditSection
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_AUDIT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { computePageRowRange } from "@shared/lib/listPaginationLogic";
import type { SecuritySanitizeAuditRow } from "@shared/domains/SecuritySanitizeDomain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Loader2 } from "lucide-react";

/** API list response shape. */
interface AuditListResponse {
  items: SecuritySanitizeAuditRow[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
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
 * Puck content sanitization audit list — embedded section on `/admin/logs`.
 *
 * @returns Sanitization audit section JSX.
 */
export function SecuritySanitizeAuditSection() {
  const [items, setItems] = useState<SecuritySanitizeAuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pathFilter, setPathFilter] = useState("");
  const [appliedPathFilter, setAppliedPathFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAudits = useCallback(
    async (pageNum: number, pathPrefix: string) => {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(DEFAULT_AUDIT_LIST_PAGE_SIZE),
      });
      if (pathPrefix.trim()) {
        params.set("pagePathPrefix", pathPrefix.trim());
      }

      const response = await fetch(`/api/admin/security-sanitize-audits?${params}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load audit log.");
      }

      const data = (await response.json()) as AuditListResponse;

      setItems(data.items);
      setPage(data.page ?? pageNum);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchAudits(page, appliedPathFilter);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load audit log.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAudits, page, appliedPathFilter]);

  const handleApplyFilter = () => {
    setAppliedPathFilter(pathFilter);
    setExpandedId(null);
    setPage(1);
  };

  const paginationSummary = useMemo(() => {
    const { from, to } = computePageRowRange(page, DEFAULT_AUDIT_LIST_PAGE_SIZE, totalCount);
    if (totalCount <= 0) return undefined;
    return `Showing ${from}–${to} of ${totalCount}`;
  }, [page, totalCount]);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
        When Puck page saves strip unsafe links, media URLs, or rich HTML, a record is stored
        here. Raw malicious payloads are never persisted — only field paths and length metadata.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor="audit-path-filter"
            className="text-xs font-medium text-(--color-text-secondary)"
          >
            Filter by page path prefix
          </label>
          <Input
            id="audit-path-filter"
            value={pathFilter}
            onChange={(event) => setPathFilter(event.target.value)}
            placeholder="/news"
          />
        </div>
        <Button type="button" variant="secondary" onClick={handleApplyFilter}>
          Apply filter
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
            Loading audit log…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-(--color-text-secondary)">
            No sanitization events recorded yet.
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
                      <Badge variant="outline">{row.source}</Badge>
                      <span className="font-mono text-sm text-(--color-text-primary)">
                        {row.pagePath}
                      </span>
                      <Badge variant="secondary">
                        {row.eventCount} field{row.eventCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-secondary)">
                      <span>{formatAuditTimestamp(row.createdAt)}</span>
                      {row.actorUserId ? <span>Editor: {row.actorUserId}</span> : null}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-border bg-muted/20 px-5 py-4">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-xs">
                          <thead>
                            <tr className="text-(--color-text-secondary)">
                              <th className="pb-2 pr-4 font-medium">Field path</th>
                              <th className="pb-2 pr-4 font-medium">Kind</th>
                              <th className="pb-2 pr-4 font-medium">Raw length</th>
                              <th className="pb-2 font-medium">After length</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.events.map((event, index) => (
                              <tr
                                key={`${row.id}-${index}`}
                                className="border-t border-border/60 text-(--color-text-primary)"
                              >
                                <td className="py-2 pr-4 font-mono">{event.path}</td>
                                <td className="py-2 pr-4">
                                  <Badge variant="outline">{event.kind}</Badge>
                                </td>
                                <td className="py-2 pr-4">{event.originalLength}</td>
                                <td className="py-2">{event.sanitizedLength}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
