"use client";

/**
 * @fileoverview Admin shell for browsing security sanitization audit records.
 *
 * @deprecated Use {@link AdminSystemLogsShell} at `/admin/logs` instead.
 * @module src/components/admin/SecuritySanitizeAuditShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import type { SecuritySanitizeAuditRow } from "@shared/domains/SecuritySanitizeDomain";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@/app/global-layout-editor.css";

/** API list response shape. */
interface AuditListResponse {
  items: SecuritySanitizeAuditRow[];
  nextCursor: string | null;
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
 * Security sanitization audit log viewer — read-only admin surface.
 *
 * @returns Audit log page JSX.
 */
export function SecuritySanitizeAuditShell() {
  const [items, setItems] = useState<SecuritySanitizeAuditRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pathFilter, setPathFilter] = useState("");
  const [appliedPathFilter, setAppliedPathFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAudits = useCallback(
    async (cursor?: string | null, append = false) => {
      const params = new URLSearchParams({ limit: "25" });
      if (cursor) params.set("cursor", cursor);
      if (appliedPathFilter.trim()) {
        params.set("pagePathPrefix", appliedPathFilter.trim());
      }

      const response = await fetch(`/api/admin/security-sanitize-audits?${params}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load audit log.");
      }

      const data = (await response.json()) as AuditListResponse;

      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    },
    [appliedPathFilter],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchAudits(null, false);
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
  }, [fetchAudits]);

  const handleApplyFilter = () => {
    setAppliedPathFilter(pathFilter);
    setExpandedId(null);
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      await fetchAudits(nextCursor, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more.");
    } finally {
      setIsLoadingMore(false);
    }
  };

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
            Back to Administration
          </Link>

          <div className="flex flex-col gap-1.5">
            <div className="mb-1 flex items-center gap-2 text-primary">
              <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wide uppercase">Security</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
              Content sanitization audit
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
              When Puck page saves strip unsafe links, media URLs, or rich HTML, a record is
              stored here. Raw malicious payloads are never persisted — only field paths and
              length metadata.
            </p>
          </div>

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
        </div>
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

        {nextCursor ? (
          <div className="border-t border-border p-4 text-center">
            <Button
              type="button"
              variant="secondary"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </StaticPageShell>
  );
}
