"use client";

/**
 * @fileoverview Tabbed shell for the User Access / permissions admin editor.
 *
 * Mirrors the Global Layout editor pattern — singleton settings with save/reset.
 *
 * @module src/components/access-control/UserAccessEditorShell
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, SlidersHorizontal, Users } from "lucide-react";
import type { AccessControlSettingsConfig } from "@shared/constants/accessControl";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import { AccessHierarchyPanel } from "@/components/access-control/AccessHierarchyPanel";
import { AccessPermissionsMatrix } from "@/components/access-control/AccessPermissionsMatrix";
import { AccessGrantRulesPanel } from "@/components/access-control/AccessGrantRulesPanel";
import "@/app/global-layout-editor.css";

/** Props for {@link UserAccessEditorShell}. */
export interface UserAccessEditorShellProps {
  initialConfig: AccessControlSettingsConfig;
}

type EditorTab = "hierarchy" | "permissions" | "grants";

/** Deep-clone access-control config for dirty tracking. */
function cloneAccessControlConfig(
  config: AccessControlSettingsConfig,
): AccessControlSettingsConfig {
  return JSON.parse(JSON.stringify(config)) as AccessControlSettingsConfig;
}

/**
 * User access settings editor at `/admin/user-access`.
 *
 * @param props - Initial singleton configuration from the server.
 * @returns Editor shell JSX.
 */
export function UserAccessEditorShell({ initialConfig }: UserAccessEditorShellProps) {
  const router = useRouter();
  const [config, setConfig] = useState(() => cloneAccessControlConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState(() => cloneAccessControlConfig(initialConfig));
  const [tab, setTab] = useState<EditorTab>("hierarchy");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({ width: 0, offset: 0, ready: false });

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  useEffect(() => {
    setSavedConfig(cloneAccessControlConfig(initialConfig));
  }, [initialConfig]);

  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const syncTabIndicator = useCallback(() => {
    const list = tabListRef.current;
    if (!list) return;
    const activeTab = list.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    if (!activeTab) return;
    setTabIndicator({
      width: activeTab.offsetWidth,
      offset: activeTab.offsetLeft,
      ready: true,
    });
  }, []);

  useLayoutEffect(() => {
    syncTabIndicator();
  }, [tab, syncTabIndicator]);

  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => syncTabIndicator());
    observer.observe(list);
    return () => observer.disconnect();
  }, [syncTabIndicator]);

  /** Revert unsaved edits. */
  function handleReset() {
    setConfig(cloneAccessControlConfig(savedConfig));
    setStatus(null);
  }

  /** Persist settings via API. */
  async function handleSave() {
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/access-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save access-control settings.");
      }

      setStatus({ type: "success", message: "Access-control settings saved successfully!" });
      setSavedConfig(cloneAccessControlConfig(config));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setStatus({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="global-layout-editor py-8 md:py-12"
      innerClassName="global-layout-editor__stack"
    >
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 dark:border-zinc-300/10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/admin"
              className="global-layout-editor__btn-text inline-flex w-fit items-center gap-1.5 border border-zinc-700/10 text-xs text-(--color-text-secondary) no-underline transition-colors hover:bg-zinc-700/10 hover:text-(--color-text-primary) dark:border-zinc-300/5 dark:hover:bg-zinc-300/5"
            >
              <ArrowLeft size={12} />
              <span>Back to Administration</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
              User Access & Permissions
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
              Configure the seven-tier access hierarchy, default permissions per tier, and downward
              grant rules. To administer user roles, an actor must outrank the target and hold the
              relevant permission — or receive it via delegation from above.
            </p>
          </div>

          <div className="hidden shrink-0 lg:block">
            <AdminEditorActionToolbar
              onReset={handleReset}
              onSave={handleSave}
              resetDisabled={!isDirty}
              saveDisabled={!isDirty}
              isSaving={isSaving}
              useEditorButtonStyle
            />
          </div>
        </div>
      </div>

      <GlobalLayoutEditorStatusBanner status={status} />

      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 lg:p-8 dark:border-zinc-300/10">
        <div
          ref={tabListRef}
          className="global-layout-editor__tabs"
          role="tablist"
          aria-label="Access control sections"
        >
          <span
            aria-hidden="true"
            className="global-layout-editor__tab-indicator"
            data-ready={tabIndicator.ready ? "true" : "false"}
            style={{
              width: tabIndicator.width,
              transform: `translateX(${tabIndicator.offset}px)`,
            }}
          />
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hierarchy"}
            className="global-layout-editor__tab"
            onClick={() => setTab("hierarchy")}
          >
            <Users size={14} />
            Hierarchy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "permissions"}
            className="global-layout-editor__tab"
            onClick={() => setTab("permissions")}
          >
            <Shield size={14} />
            Permissions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "grants"}
            className="global-layout-editor__tab"
            onClick={() => setTab("grants")}
          >
            <SlidersHorizontal size={14} />
            Grant Rules
          </button>
        </div>

        <div key={tab} className="global-layout-editor__panel">
          {tab === "hierarchy" && (
            <AccessHierarchyPanel
              levels={config.levels}
              onChange={(levels) => setConfig({ ...config, levels })}
            />
          )}
          {tab === "permissions" && (
            <AccessPermissionsMatrix
              levels={config.levels}
              levelPermissions={config.levelPermissions}
              onChange={(levelPermissions) => setConfig({ ...config, levelPermissions })}
            />
          )}
          {tab === "grants" && (
            <AccessGrantRulesPanel
              levels={config.levels}
              grantRules={config.grantRules}
              onChange={(grantRules) => setConfig({ ...config, grantRules })}
            />
          )}
        </div>
      </div>

      {isDirty ? <div className="h-16 lg:hidden" aria-hidden="true" /> : null}

      {isDirty ? (
        <div className="admin-mobile-toolbar lg:hidden">
          <AdminEditorActionToolbar
            onReset={handleReset}
            onSave={handleSave}
            resetDisabled={!isDirty}
            saveDisabled={!isDirty}
            isSaving={isSaving}
            useEditorButtonStyle
            className="w-full justify-end"
          />
        </div>
      ) : null}
    </StaticPageShell>
  );
}

export default UserAccessEditorShell;
