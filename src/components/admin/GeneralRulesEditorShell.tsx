"use client";

/**
 * @fileoverview Admin editor for institutional general rules (content + Telegram copy).
 *
 * @module src/components/admin/GeneralRulesEditorShell
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { GeneralRulesPublicConfig } from "@shared/domains/GeneralRulesDomain";
import { TelegramMessageTemplatesEditor } from "@/components/admin/TelegramMessageTemplatesEditor";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import {
  parseBlockedWordsTextarea,
  parseWeakPasswordsTextarea,
  serializeBlockedWordsTextarea,
  serializeWeakPasswordsTextarea,
} from "@shared/lib/generalRulesListParsing";
import { slugifyTaskCategoryId } from "@shared/lib/taskCategoriesSettingsLogic";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "@/app/global-layout-editor.css";

/** Props for {@link GeneralRulesEditorShell}. */
export interface GeneralRulesEditorShellProps {
  /** Initial config from the server. */
  initialConfig: GeneralRulesPublicConfig;
}

type EditorTab = "content" | "telegram" | "messages" | "tasks";

/** Deep-clone general rules config. */
function cloneGeneralRulesConfig(config: GeneralRulesPublicConfig): GeneralRulesPublicConfig {
  return JSON.parse(JSON.stringify(config)) as GeneralRulesPublicConfig;
}

/**
 * Admin general rules editor at `/admin/general-rules`.
 *
 * @param props - Initial singleton configuration.
 * @returns Editor shell JSX.
 */
export function GeneralRulesEditorShell({ initialConfig }: GeneralRulesEditorShellProps) {
  const router = useRouter();
  const [config, setConfig] = useState(() => cloneGeneralRulesConfig(initialConfig));
  const [savedConfig, setSavedConfig] = useState(() => cloneGeneralRulesConfig(initialConfig));
  const [tab, setTab] = useState<EditorTab>("content");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const blockedWordsText = useMemo(
    () => serializeBlockedWordsTextarea(config.blockedWords),
    [config.blockedWords],
  );
  const weakPasswordsText = useMemo(
    () => serializeWeakPasswordsTextarea(config.weakPasswords),
    [config.weakPasswords],
  );

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  useEffect(() => {
    setSavedConfig(cloneGeneralRulesConfig(initialConfig));
  }, [initialConfig]);

  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  /** Revert unsaved edits. */
  function handleReset() {
    setConfig(cloneGeneralRulesConfig(savedConfig));
    setStatus(null);
  }

  /** Persist settings via API. */
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
        throw new Error(data.error ?? "Failed to save general rules.");
      }

      const next = cloneGeneralRulesConfig(data.config ?? config);
      setConfig(next);
      setSavedConfig(next);
      setStatus({ type: "success", message: "General rules saved." });
      router.refresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save general rules.",
      });
    } finally {
      setIsSaving(false);
    }
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
            <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">General rules</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            Content policy, tasks &amp; Telegram copy
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
            Manage blocked words, weak-password denylist, user-facing validation messages, task
            delegation quotas, task scoring categories, and Telegram bot templates. Numeric fields (group numbers, phones)
            are never scanned by the language filter.
          </p>
        </div>
      </div>

      <div className="glass-panel flex flex-wrap gap-2 rounded-lg border border-zinc-700/20 p-2 dark:border-zinc-300/10">
        {(
          [
            ["content", "Content policy"],
            ["tasks", "Tasks"],
            ["telegram", "Telegram bot"],
            ["messages", "User messages"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-(--color-bg-elevated) text-(--color-text-primary)"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {status ? (
        <GlobalLayoutEditorStatusBanner status={status} />
      ) : null}

      {tab === "content" ? (
        <section className="glass-panel flex flex-col gap-6 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
          <FormField
            label="Blocked words & phrases"
            htmlFor="general-rules-blocked-words"
            hint="One term per line. Optional category: term | profanity. Applies to prose fields and rich text — not numbers."
          >
            <textarea
              id="general-rules-blocked-words"
              rows={14}
              value={blockedWordsText}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  blockedWords: parseBlockedWordsTextarea(e.target.value),
                }))
              }
              className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 font-mono text-sm text-(--color-text-primary)"
            />
          </FormField>

          <FormField
            label="Weak passwords denylist"
            htmlFor="general-rules-weak-passwords"
            hint="One password per line. Used at signup and password change."
          >
            <textarea
              id="general-rules-weak-passwords"
              rows={10}
              value={weakPasswordsText}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  weakPasswords: parseWeakPasswordsTextarea(e.target.value),
                }))
              }
              className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 font-mono text-sm text-(--color-text-primary)"
            />
          </FormField>
        </section>
      ) : null}

      {tab === "tasks" ? (
        <section className="glass-panel flex flex-col gap-6 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
          <p className="text-sm text-(--color-text-secondary)">
            Maximum number of times a performer may delegate a task to someone else. Leave blank or
            check &ldquo;Unlimited&rdquo; for no cap at that tier.
          </p>
          {DEFAULT_ACCESS_LEVELS.map((level) => {
            const key = String(level.index);
            const raw = config.taskDelegationLimits[key];
            const unlimited = raw === null;

            return (
              <FormField
                key={key}
                label={level.label}
                htmlFor={`task-delegation-${key}`}
                hint={level.description}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id={`task-delegation-${key}`}
                    type="number"
                    min={0}
                    max={100}
                    disabled={unlimited}
                    value={unlimited ? "" : String(raw ?? 0)}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        taskDelegationLimits: {
                          ...prev.taskDelegationLimits,
                          [key]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
                        },
                      }));
                    }}
                    className="max-w-[8rem]"
                  />
                  <label className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                    <input
                      type="checkbox"
                      checked={unlimited}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          taskDelegationLimits: {
                            ...prev.taskDelegationLimits,
                            [key]: e.target.checked ? null : 0,
                          },
                        }))
                      }
                    />
                    Unlimited
                  </label>
                </div>
              </FormField>
            );
          })}

          <div className="border-t border-(--color-border-default) pt-6">
            <h2 className="text-base font-semibold text-(--color-text-primary)">Task categories</h2>
            <p className="mt-1 text-sm text-(--color-text-secondary)">
              Categories define the allowed base score (B) range per assignment type and default Q/T
              coefficient percents. Used on task create and in the task list filter.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {config.taskCategories.map((category, index) => (
                <div
                  key={`${category.id}-${index}`}
                  className="rounded-md border border-(--color-border-default) bg-(--color-bg-elevated) p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-(--color-text-primary)">
                      {category.label}{" "}
                      <span className="font-mono text-xs text-(--color-text-secondary)">
                        ({category.id})
                      </span>
                    </p>
                    <label className="flex items-center gap-2 text-xs text-(--color-text-secondary)">
                      <input
                        type="checkbox"
                        checked={category.enabled}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, enabled: e.target.checked } : row,
                            ),
                          }))
                        }
                      />
                      Enabled in picker
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Label">
                      <Input
                        value={category.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, label } : row,
                            ),
                          }));
                        }}
                      />
                    </FormField>
                    <FormField label="Base score min (B)">
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={category.baseScoreMin}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    baseScoreMin: Number.isFinite(parsed) ? parsed : row.baseScoreMin,
                                  }
                                : row,
                            ),
                          }));
                        }}
                      />
                    </FormField>
                    <FormField label="Base score max (B)">
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={category.baseScoreMax}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    baseScoreMax: Number.isFinite(parsed) ? parsed : row.baseScoreMax,
                                  }
                                : row,
                            ),
                          }));
                        }}
                      />
                    </FormField>
                    <FormField label="Default quality % (Q)">
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        value={category.defaultQualityPercent}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    defaultQualityPercent: Number.isFinite(parsed)
                                      ? parsed
                                      : row.defaultQualityPercent,
                                  }
                                : row,
                            ),
                          }));
                        }}
                      />
                    </FormField>
                    <FormField label="Default time % (T)">
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        value={category.defaultTimePercent}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            taskCategories: prev.taskCategories.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    defaultTimePercent: Number.isFinite(parsed)
                                      ? parsed
                                      : row.defaultTimePercent,
                                  }
                                : row,
                            ),
                          }));
                        }}
                      />
                    </FormField>
                  </div>

                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          taskCategories: prev.taskCategories.filter((_, rowIndex) => rowIndex !== index),
                        }))
                      }
                    >
                      Remove category
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              className="mt-4"
              variant="outline"
              onClick={() => {
                const label = `Category ${config.taskCategories.length + 1}`;
                setConfig((prev) => ({
                  ...prev,
                  taskCategories: [
                    ...prev.taskCategories,
                    {
                      id: slugifyTaskCategoryId(`${label}-${Date.now()}`),
                      label,
                      baseScoreMin: 1,
                      baseScoreMax: 100,
                      defaultQualityPercent: 100,
                      defaultTimePercent: 100,
                      enabled: true,
                    },
                  ],
                }));
              }}
            >
              Add category
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "telegram" ? (
        <section className="glass-panel flex flex-col gap-6 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
          <p className="text-sm text-(--color-text-secondary)">
            For a focused bot-only workspace, open{" "}
            <Link href="/admin/telegram-bot" className="text-(--color-text-primary) underline">
              Telegram Bot Messages
            </Link>
            .
          </p>
          <TelegramMessageTemplatesEditor
            templates={config.telegramMessages}
            onChange={(key, value) =>
              setConfig((prev) => ({
                ...prev,
                telegramMessages: {
                  ...prev.telegramMessages,
                  [key]: value,
                },
              }))
            }
          />
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="glass-panel flex flex-col gap-6 rounded-lg border border-zinc-700/20 p-6 dark:border-zinc-300/10">
          <FormField
            label="Blocked language message"
            htmlFor="general-rules-blocked-message"
            hint="Shown in forms and the rich text editor when prose contains a blocked term."
          >
            <Input
              id="general-rules-blocked-message"
              value={config.blockedWordMessage}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, blockedWordMessage: e.target.value }))
              }
            />
          </FormField>

          <FormField
            label="Weak password message"
            htmlFor="general-rules-weak-password-message"
            hint="Shown when a user picks a denylisted password."
          >
            <Input
              id="general-rules-weak-password-message"
              value={config.weakPasswordMessage}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, weakPasswordMessage: e.target.value }))
              }
            />
          </FormField>
        </section>
      ) : null}

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

export default GeneralRulesEditorShell;
