"use client";

/**
 * @fileoverview Dedicated admin editor for institutional Telegram bot message templates.
 *
 * @module src/components/admin/TelegramBotMessagesEditorShell
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { GeneralRulesPublicConfig } from "@shared/domains/GeneralRulesDomain";
import type { TelegramMessageTemplateKey } from "@shared/constants/generalRules";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { TelegramMessageTemplatesEditor } from "@/components/admin/TelegramMessageTemplatesEditor";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import "@/app/global-layout-editor.css";

/** Props for {@link TelegramBotMessagesEditorShell}. */
export interface TelegramBotMessagesEditorShellProps {
  /** Initial general rules config (telegram slice is persisted via the same API). */
  initialConfig: GeneralRulesPublicConfig;
}

/** Deep-clone general rules config. */
function cloneConfig(config: GeneralRulesPublicConfig): GeneralRulesPublicConfig {
  return JSON.parse(JSON.stringify(config)) as GeneralRulesPublicConfig;
}

/**
 * Focused Telegram bot templates admin page at `/admin/telegram-bot`.
 *
 * @param props - Initial singleton configuration.
 * @returns Editor shell JSX.
 */
export function TelegramBotMessagesEditorShell({
  initialConfig,
}: TelegramBotMessagesEditorShellProps) {
  const router = useRouter();
  const [config, setConfig] = useState(() => cloneConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState(() => cloneConfig(initialConfig));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(config.telegramMessages) !== JSON.stringify(savedConfig.telegramMessages),
    [config.telegramMessages, savedConfig.telegramMessages],
  );

  useEffect(() => {
    setSavedConfig(cloneConfig(initialConfig));
    setConfig(cloneConfig(initialConfig));
  }, [initialConfig]);

  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  /** Revert unsaved Telegram template edits. */
  function handleReset() {
    setConfig(cloneConfig(savedConfig));
    setStatus(null);
  }

  /** Persist Telegram templates via the general rules API. */
  async function handleSave() {
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/general-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { error?: string; config?: GeneralRulesPublicConfig };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save Telegram bot messages.");
      }

      const next = cloneConfig(data.config ?? config);
      setConfig(next);
      setSavedConfig(next);
      setStatus({ type: "success", message: "Telegram bot messages saved." });
      router.refresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Telegram bot messages.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  /** Update one template key in local state. */
  function handleTemplateChange(key: TelegramMessageTemplateKey, value: string) {
    setConfig((prev) => ({
      ...prev,
      telegramMessages: {
        ...prev.telegramMessages,
        [key]: value,
      },
    }));
  }

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="pb-28 py-8 md:py-12"
      innerClassName="flex flex-col gap-6"
    >
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-(--color-text-secondary) no-underline hover:text-(--color-text-primary)"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Administration
        </Link>

        <div className="flex flex-col gap-1.5">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">Telegram bot</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            Bot message templates
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
            Default copy for /start, phone harvest, broadcasts, page go-live DMs, and registration
            prompts. Page publishers can enable Telegram notifications per page in the Puck Publication
            chapter; delivery still respects each member&apos;s notification preferences.
          </p>
          <p className="text-sm text-(--color-text-secondary)">
            Content policy and task settings remain on{" "}
            <Link href="/admin/general-rules" className="text-(--color-text-primary) underline">
              General Rules
            </Link>
            .
          </p>
        </div>
      </div>

      {status ? (
        <GlobalLayoutEditorStatusBanner status={status} />
      ) : null}

      <section className="glass-panel flex flex-col gap-6 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
        <TelegramMessageTemplatesEditor
          templates={config.telegramMessages}
          onChange={handleTemplateChange}
        />
      </section>

      <div className="admin-mobile-toolbar lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <AdminEditorActionToolbar
          onReset={handleReset}
          onSave={handleSave}
          resetDisabled={!isDirty}
          saveDisabled={!isDirty}
          isSaving={isSaving}
          useEditorButtonStyle
        />
      </div>
    </StaticPageShell>
  );
}

export default TelegramBotMessagesEditorShell;
