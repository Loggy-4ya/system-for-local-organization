"use client";

/**
 * @fileoverview Admin diagnostics for hosting mode and env validation.
 *
 * @module src/components/admin/HostingConfigEditorShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Server } from "lucide-react";
import type { NexusHostingEffectivePolicy } from "@shared/lib/nexusHostingLogic";
import type { NexusHostingMode } from "@shared/constants/nexusHosting";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** API response from GET /api/admin/hosting-config. */
interface HostingConfigResponse {
  mode: NexusHostingMode;
  modeLabel: string;
  policy: NexusHostingEffectivePolicy;
  warnings: string[];
  errors: string[];
  healthy: boolean;
}

/**
 * Admin hosting diagnostics at `/admin/hosting`.
 */
export function HostingConfigEditorShell() {
  const [data, setData] = useState<HostingConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/hosting-config");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load hosting config.");
      setLoading(false);
      return;
    }
    setData(json as HostingConfigResponse);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="py-8 md:py-12"
      innerClassName="flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Admin hub
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div
        className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Server size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">Platform</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            Hosting & deployment
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
            Resolved hosting mode, scheduler policy, and environment validation for this running
            instance. See{" "}
            <code className="text-xs">.ai/docs/features/hosting_and_deployment.md</code> for deploy
            profiles.
          </p>
        </div>
      </div>

      {error ? <FormAlert variant="destructive">{error}</FormAlert> : null}

      {data ? (
        <div className="glass-panel flex flex-col gap-5 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-(--color-text-primary)">Mode</span>
            <Badge variant={data.healthy ? "default" : "destructive"}>
              {data.modeLabel} ({data.mode})
            </Badge>
            <Badge variant={data.healthy ? "secondary" : "destructive"}>
              {data.healthy ? "Healthy" : "Misconfigured"}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <PolicyRow
              label="In-process scheduler"
              value={data.policy.scheduledEventsTickIntervalMs > 0 ? "on" : "off"}
            />
            <PolicyRow
              label="Tick interval (ms)"
              value={String(data.policy.scheduledEventsTickIntervalMs)}
            />
            <PolicyRow
              label="In-process media cleanup (h)"
              value={String(data.policy.mediaOrphanCleanupIntervalHours)}
            />
            <PolicyRow
              label="Cron required in prod"
              value={data.policy.requireCronSecretInProduction ? "yes" : "no"}
            />
            <PolicyRow
              label="Local media allowed in prod"
              value={data.policy.allowLocalMediaInProduction ? "yes" : "no"}
            />
            <PolicyRow
              label="Telegram worker expected"
              value={data.policy.telegramWorkerExpected ? "yes" : "no"}
            />
          </div>

          {data.warnings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-(--color-text-primary)">Warnings</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-(--color-text-secondary)">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.errors.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-destructive">Errors</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                {data.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </StaticPageShell>
  );
}

/** One policy key/value row. */
function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-zinc-700/15 px-3 py-2 dark:border-zinc-300/10">
      <span className="text-xs text-(--color-text-secondary)">{label}</span>
      <span className="font-medium text-(--color-text-primary)">{value}</span>
    </div>
  );
}
