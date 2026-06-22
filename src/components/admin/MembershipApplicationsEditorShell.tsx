"use client";

/**
 * @fileoverview Admin queue for self-government membership applications.
 *
 * @module src/components/admin/MembershipApplicationsEditorShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";
import type { MembershipApplicationRowDto } from "@shared/domains/MembershipApplicationDomain";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/ui/form-alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Admin membership application review at `/admin/membership-applications`.
 *
 * @returns Review queue shell JSX.
 */
export function MembershipApplicationsEditorShell() {
  const [applications, setApplications] = useState<MembershipApplicationRowDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(DEFAULT_LIST_PAGE_SIZE),
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }

    const res = await fetch(`/api/admin/membership-applications?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
    } else {
      setError("Could not load applications.");
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleApprove = async (userId: string) => {
    setActingId(userId);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/membership-applications/${userId}/approve`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("Application approved.");
      await loadApplications();
    } else {
      setError(typeof data.error === "string" ? data.error : "Could not approve application.");
    }
    setActingId(null);
  };

  const handleReject = async (userId: string) => {
    setActingId(userId);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/membership-applications/${userId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("Application rejected.");
      await loadApplications();
    } else {
      setError(typeof data.error === "string" ? data.error : "Could not reject application.");
    }
    setActingId(null);
  };

  const pageStart = totalCount === 0 ? 0 : (page - 1) * DEFAULT_LIST_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * DEFAULT_LIST_PAGE_SIZE, totalCount);

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="py-8 md:py-12"
      innerClassName="flex flex-col gap-6"
    >
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10">
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-2 inline-flex gap-1.5",
          )}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Administration
        </Link>
        <div className="flex items-center gap-2 text-primary">
          <UserCheck size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide uppercase">Membership</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-(--color-text-primary)">
          Membership applications
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-(--color-text-secondary)">
          Review students who applied for self-government membership. Approving assigns the member
          socium role and initializes quality scores.
        </p>
      </div>

      {error ? <FormAlert variant="destructive">{error}</FormAlert> : null}
      {message ? <FormAlert variant="success">{message}</FormAlert> : null}

      <div className="glass-panel flex flex-col gap-4 rounded-lg p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput);
          }}
        >
          <div className="flex-1">
            <label
              htmlFor="membership-search"
              className="mb-1 block text-xs font-medium text-(--color-text-secondary)"
            >
              Search applicants
            </label>
            <Input
              id="membership-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, login, specialty, or group"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-(--color-text-secondary)">Loading…</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-(--color-text-secondary)">No pending applications.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {applications.map((application) => (
              <li
                key={application.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {application.fullName}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                      {[application.specialty, application.group].filter(Boolean).join(" · ") ||
                        "No specialty / group"}
                    </p>
                    {application.login ? (
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Login: {application.login}
                        {application.phone ? ` · ${application.phone}` : ""}
                      </p>
                    ) : null}
                    {!application.readyForReview ? (
                      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                        Profile incomplete: {application.missingFieldLabels.join(", ")}
                      </p>
                    ) : (
                      <Badge variant="secondary" className="mt-2">
                        Ready for review
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        actingId === application.id ||
                        !application.canApprove ||
                        !application.readyForReview
                      }
                      onClick={() => void handleApprove(application.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actingId === application.id || !application.canReject}
                      onClick={() => void handleReject(application.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <NexusListPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={loading}
          summary={
            totalCount > 0
              ? `Showing ${pageStart}–${pageEnd} of ${totalCount} pending applications`
              : undefined
          }
        />
      </div>
    </StaticPageShell>
  );
}

export default MembershipApplicationsEditorShell;
