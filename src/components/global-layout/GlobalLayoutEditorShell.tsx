"use client";

/**
 * @fileoverview Tabbed shell for the Global Layout Admin Editor (/admin/global-layout).
 *
 * Imbued with beautiful, modern glassmorphic UI/UX styling, fully integrated with
 * the project's light/dark design tokens.
 *
 * @module src/components/global-layout/GlobalLayoutEditorShell
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Layout, Columns } from "lucide-react";
import Link from "next/link";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { HeaderChromeEditor } from "./HeaderChromeEditor";
import { FooterChromeEditor } from "./FooterChromeEditor";
import { ChromePreviewPanel } from "./ChromePreviewPanel";
import { GlobalLayoutEditorStatusBanner } from "./GlobalLayoutEditorStatusBanner";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { type GlobalLayoutConfig } from "@shared/constants/globalLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/app/global-layout-editor.css";

interface GlobalLayoutEditorShellProps {
  initialConfig: GlobalLayoutConfig;
}

type EditorTab = "header" | "footer";

/** Deep-clones a global layout config for editor reset/snapshot safety. */
function cloneGlobalLayoutConfig(config: GlobalLayoutConfig): GlobalLayoutConfig {
  return JSON.parse(JSON.stringify(config)) as GlobalLayoutConfig;
}

/** Serialises config for dirty-state comparison in the editor shell. */
function serialiseGlobalLayoutConfig(config: GlobalLayoutConfig): string {
  return JSON.stringify(config);
}

export function GlobalLayoutEditorShell({ initialConfig }: GlobalLayoutEditorShellProps) {
  const router = useRouter();
  const [config, setConfig] = useState<GlobalLayoutConfig>(() => cloneGlobalLayoutConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState<GlobalLayoutConfig>(() =>
    cloneGlobalLayoutConfig(initialConfig),
  );
  const [tab, setTab] = useState<EditorTab>("header");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({ width: 0, offset: 0, ready: false });
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const isDirty = useMemo(
    () => serialiseGlobalLayoutConfig(config) !== serialiseGlobalLayoutConfig(savedConfig),
    [config, savedConfig],
  );

  useEffect(() => {
    setSavedConfig(cloneGlobalLayoutConfig(initialConfig));
  }, [initialConfig]);

  /** Auto-dismiss success toasts after a short read window. */
  useEffect(() => {
    if (status?.type !== "success") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatus(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [status]);

  /** Reverts unsaved header/footer edits to the last saved configuration. */
  const handleReset = () => {
    setConfig(cloneGlobalLayoutConfig(savedConfig));
    setStatus(null);
  };

  /** Positions the sliding pill behind the active tab button. */
  const syncTabIndicator = useCallback(() => {
    const list = tabListRef.current;
    if (!list) return;

    const activeTab = list.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]',
    );
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

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/global-layout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save global layout settings.");
      }

      setStatus({ type: "success", message: "Global layout configuration saved successfully!" });
      setSavedConfig(cloneGlobalLayoutConfig(config));
      router.refresh();
    } catch (err: any) {
      console.error("[GlobalLayoutEditor] Save error:", err);
      setStatus({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="global-layout-editor py-8 md:py-12"
      innerClassName="global-layout-editor__stack"
    >
      {/* Page Header wrapped in a glass-panel */}
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 dark:border-zinc-300/10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="global-layout-editor__btn-text inline-flex items-center gap-1.5 border border-zinc-700/10 text-xs text-(--color-text-secondary) no-underline transition-colors hover:bg-zinc-700/10 hover:text-(--color-text-primary) dark:border-zinc-300/5 dark:hover:bg-zinc-300/5"
              >
                <ArrowLeft size={12} />
                <span>Back to Administration</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
              Global Layout Editor
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-(--color-text-secondary)">
              Configure the global navigation header and footer columns for all standard pages. Changes will apply system-wide.
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

      {/* Status Alert */}
      <GlobalLayoutEditorStatusBanner status={status} />

      {/* Editor settings */}
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 lg:p-8 dark:border-zinc-300/10">
        <div
          ref={tabListRef}
          className="global-layout-editor__tabs"
          role="tablist"
          aria-label="Editor sections"
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
            id="global-layout-tab-header"
            aria-selected={tab === "header"}
            aria-controls="global-layout-panel-header"
            className="global-layout-editor__tab"
            onClick={() => setTab("header")}
          >
            <Layout size={14} />
            Header Navigation
          </button>
          <button
            type="button"
            role="tab"
            id="global-layout-tab-footer"
            aria-selected={tab === "footer"}
            aria-controls="global-layout-panel-footer"
            className="global-layout-editor__tab"
            onClick={() => setTab("footer")}
          >
            <Columns size={14} />
            Footer Columns
          </button>
        </div>

        <div
          key={tab}
          role="tabpanel"
          id={tab === "header" ? "global-layout-panel-header" : "global-layout-panel-footer"}
          aria-labelledby={tab === "header" ? "global-layout-tab-header" : "global-layout-tab-footer"}
          className="global-layout-editor__panel"
        >
          {tab === "header" ? (
            <HeaderChromeEditor
              config={config.header}
              onChange={(header) => setConfig({ ...config, header })}
            />
          ) : (
            <FooterChromeEditor
              config={config.footer}
              onChange={(footer) => setConfig({ ...config, footer })}
            />
          )}
        </div>
      </div>

      {/* Live preview — full width below settings; collapsed on phone by default */}
      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          className="global-layout-editor__btn-text w-full gap-2"
          onClick={() => setShowMobilePreview((prev) => !prev)}
        >
          {showMobilePreview ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          {showMobilePreview ? "Hide live preview" : "Show live preview"}
        </Button>
      </div>

      <div
        className={cn(
          "glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 lg:p-8 dark:border-zinc-300/10",
          showMobilePreview ? "block" : "hidden md:block",
        )}
      >
        <ChromePreviewPanel header={config.header} footer={config.footer} activeTab={tab} />
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

export default GlobalLayoutEditorShell;
