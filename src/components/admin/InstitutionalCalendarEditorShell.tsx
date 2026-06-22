"use client";

/**
 * @fileoverview Admin editor for institutional yearly calendar rules.
 *
 * @module src/components/admin/InstitutionalCalendarEditorShell
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import type { InstitutionalCalendarRuleDto } from "@shared/domains/InstitutionalCalendarDomain";
import {
  DEFAULT_INSTITUTIONAL_TASK_TEMPLATE,
  INSTITUTIONAL_CALENDAR_ACTION_LABELS,
  INSTITUTIONAL_CALENDAR_ACTIONS,
  INSTITUTIONAL_CALENDAR_SOCIUM_KINDS,
  type InstitutionalCalendarAction,
  type InstitutionalYearlyAnchor,
} from "@shared/constants/institutionalCalendar";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import type { SociumRoleKind } from "@shared/models/userTypes";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import { InstitutionalYearlyAnchorField } from "@/components/admin/InstitutionalYearlyAnchorField";
import { TaskChannelToggleGroup } from "@/components/tasks/TaskChannelToggleGroup";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Empty draft for a new rule. */
function createEmptyDraft(): Omit<InstitutionalCalendarRuleDto, "id" | "authorUserId" | "authorDisplayName" | "createdAt" | "updatedAt"> {
  return {
    title: "",
    description: "",
    enabled: true,
    action: "spawn_task_and_notify",
    yearlyAnchors: [],
    targetSociumKinds: [],
    targetSociumRoleKeys: [],
    targetAccessLevelIndexes: [],
    channels: ["web"],
    taskTemplate: { ...DEFAULT_INSTITUTIONAL_TASK_TEMPLATE },
  };
}

/**
 * Admin institutional calendar editor at `/admin/institutional-calendar`.
 *
 * @returns Editor shell JSX.
 */
export function InstitutionalCalendarEditorShell() {
  const [rules, setRules] = useState<InstitutionalCalendarRuleDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(createEmptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/institutional-calendar");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  /** Start editing an existing rule. */
  function selectRule(rule: InstitutionalCalendarRuleDto) {
    setSelectedId(rule.id);
    setDraft({
      title: rule.title,
      description: rule.description,
      enabled: rule.enabled,
      action: rule.action,
      yearlyAnchors: rule.yearlyAnchors,
      targetSociumKinds: rule.targetSociumKinds,
      targetSociumRoleKeys: rule.targetSociumRoleKeys,
      targetAccessLevelIndexes: rule.targetAccessLevelIndexes,
      channels: rule.channels,
      taskTemplate: rule.taskTemplate,
    });
    setError(null);
    setMessage(null);
  }

  /** Reset to new rule draft. */
  function startNewRule() {
    setSelectedId(null);
    setDraft(createEmptyDraft());
    setError(null);
    setMessage(null);
  }

  /** Toggle socium kind in target filter. */
  function toggleSociumKind(kind: SociumRoleKind) {
    setDraft((current) => ({
      ...current,
      targetSociumKinds: current.targetSociumKinds.includes(kind)
        ? current.targetSociumKinds.filter((k) => k !== kind)
        : [...current.targetSociumKinds, kind],
    }));
  }

  /** Toggle access level in target filter. */
  function toggleAccessLevel(index: AccessLevelIndex) {
    setDraft((current) => ({
      ...current,
      targetAccessLevelIndexes: current.targetAccessLevelIndexes.includes(index)
        ? current.targetAccessLevelIndexes.filter((i) => i !== index)
        : [...current.targetAccessLevelIndexes, index],
    }));
  }

  /** Persist create or update. */
  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = { ...draft };
    const res = await fetch(
      selectedId ? `/api/admin/institutional-calendar/${selectedId}` : "/api/admin/institutional-calendar",
      {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Save failed.");
      setSaving(false);
      return;
    }

    const saved = (await res.json()) as InstitutionalCalendarRuleDto;
    setMessage("Saved.");
    setSelectedId(saved.id);
    await loadRules();
    setSaving(false);
  }

  /** Delete selected rule. */
  async function handleDelete() {
    if (!selectedId || !window.confirm("Delete this calendar rule?")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/institutional-calendar/${selectedId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed.");
      setSaving(false);
      return;
    }
    startNewRule();
    await loadRules();
    setSaving(false);
  }

  const showTaskTemplate =
    draft.action === "spawn_task" || draft.action === "spawn_task_and_notify";

  return (
    <StaticPageShell contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin} className="py-8">
      <div className="glass-panel flex w-full flex-col gap-6 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-user)] hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Admin hub
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              <CalendarDays className="size-6" aria-hidden="true" />
              Institutional calendar
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              Yearly recurring reminders and optional auto-created tasks for socium roles and access
              tiers. Use {"{year}"} in task templates for the fire year.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={startNewRule}>
            New rule
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Rules
            </p>
            {loading ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No rules yet.</p>
            ) : (
              rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => selectRule(rule)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    selectedId === rule.id
                      ? "border-[var(--color-accent-user)] bg-[color-mix(in_srgb,var(--color-accent-user)_10%,transparent)]"
                      : "border-[var(--color-border-default)]"
                  }`}
                >
                  {rule.title}
                  {!rule.enabled ? " (disabled)" : ""}
                </button>
              ))
            )}
          </aside>

          <div className="flex flex-col gap-4">
            <FormField label="Title" required>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={200}
              />
            </FormField>

            <FormField label="Description">
              <textarea
                className="nexus-puck-input min-h-[80px] w-full"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </FormField>

            <FormField label="When it fires">
              <InstitutionalYearlyAnchorField
                value={draft.yearlyAnchors as InstitutionalYearlyAnchor[]}
                onChange={(yearlyAnchors) => setDraft({ ...draft, yearlyAnchors })}
              />
            </FormField>

            <FormField label="Action">
              <Select
                value={draft.action}
                onValueChange={(action) =>
                  setDraft({ ...draft, action: action as InstitutionalCalendarAction })
                }
              >
                <SelectTrigger className="nexus-puck-input w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTIONAL_CALENDAR_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action} label={INSTITUTIONAL_CALENDAR_ACTION_LABELS[action]}>
                      {INSTITUTIONAL_CALENDAR_ACTION_LABELS[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {showTaskTemplate ? (
              <>
                <FormField label="Task title template" hint="Use {year} for the fire year.">
                  <Input
                    value={draft.taskTemplate.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        taskTemplate: { ...draft.taskTemplate, title: e.target.value },
                      })
                    }
                  />
                </FormField>
                <FormField label="Task description template">
                  <textarea
                    className="nexus-puck-input min-h-[80px] w-full"
                    value={draft.taskTemplate.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        taskTemplate: { ...draft.taskTemplate, description: e.target.value },
                      })
                    }
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="Socium roles">
              <div className="flex flex-wrap gap-2">
                {INSTITUTIONAL_CALENDAR_SOCIUM_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleSociumKind(kind)}
                    className={`rounded-md border px-3 py-1 text-xs capitalize ${
                      draft.targetSociumKinds.includes(kind)
                        ? "border-[var(--color-accent-user)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {kind.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Access levels">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ACCESS_LEVELS.map((level) => (
                  <button
                    key={level.index}
                    type="button"
                    onClick={() => toggleAccessLevel(level.index)}
                    className={`rounded-md border px-3 py-1 text-xs ${
                      draft.targetAccessLevelIndexes.includes(level.index)
                        ? "border-[var(--color-accent-user)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Delivery channels">
              <TaskChannelToggleGroup
                value={draft.channels}
                onChange={(channels) => setDraft({ ...draft, channels })}
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Rule enabled
            </label>

            {error ? (
              <FormAlert variant="error" title="Error">
                {error}
              </FormAlert>
            ) : null}
            {message ? (
              <FormAlert variant="success" title="Saved">
                {message}
              </FormAlert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : selectedId ? "Update rule" : "Create rule"}
              </Button>
              {selectedId ? (
                <Button type="button" variant="destructive" disabled={saving} onClick={() => void handleDelete()}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}

export default InstitutionalCalendarEditorShell;
