"use client";

/**
 * @fileoverview Author-only scoring panel — base score (B) and per-performer Q/T percents.
 *
 * @module src/components/tasks/TaskScorePanel
 */

import React, { useMemo, useState } from "react";
import type { TaskDetailDto } from "@shared/domains/TaskDomain";
import {
  TASK_COEFFICIENT_PERCENT_MAX,
  TASK_COEFFICIENT_PERCENT_MIN,
} from "@shared/constants/taskSettings";
import { computeTaskPerformerFinalScore } from "@shared/lib/taskScoreLogic";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Score draft for one performer. */
export interface TaskPerformerScoreDraft {
  qualityPercent: string;
  timePercent: string;
}

/** Props for {@link TaskScorePanel}. */
export interface TaskScorePanelProps {
  /** Task detail with performers and category defaults. */
  task: TaskDetailDto;
  /** Persist scores via parent action handler. */
  onSubmit: (payload: {
    complete: boolean;
    baseScore: number;
    scores: Array<{
      userId: string;
      qualityPercent: number;
      timePercent: number;
    }>;
  }) => Promise<void>;
}

/**
 * Build initial score drafts from task performers and category defaults.
 *
 * @param task - Task detail DTO.
 * @returns Map of performer user id → draft fields.
 */
function buildInitialDrafts(task: TaskDetailDto): Record<string, TaskPerformerScoreDraft> {
  const defaultQ = String(task.scoringCategory?.defaultQualityPercent ?? 100);
  const defaultT = String(task.scoringCategory?.defaultTimePercent ?? 100);
  const drafts: Record<string, TaskPerformerScoreDraft> = {};

  for (const performer of task.performers) {
    drafts[performer.userId] = {
      qualityPercent:
        performer.qualityPercent != null ? String(performer.qualityPercent) : defaultQ,
      timePercent: performer.timePercent != null ? String(performer.timePercent) : defaultT,
    };
  }

  return drafts;
}

/**
 * Scoring panel for the task assigner only.
 *
 * @param props - Task detail and submit handler.
 * @returns Score panel JSX.
 */
export function TaskScorePanel({ task, onSubmit }: TaskScorePanelProps) {
  const [baseScore, setBaseScore] = useState(() =>
    task.baseScore != null ? String(task.baseScore) : "",
  );
  const [drafts, setDrafts] = useState<Record<string, TaskPerformerScoreDraft>>(() =>
    buildInitialDrafts(task),
  );
  const [saving, setSaving] = useState(false);

  const baseScoreNumeric = Number(baseScore);
  const baseScoreValid = Number.isFinite(baseScoreNumeric);

  const previews = useMemo(() => {
    const output: Record<string, number | null> = {};
    if (!baseScoreValid) return output;

    for (const performer of task.performers) {
      const draft = drafts[performer.userId];
      if (!draft) continue;
      const qualityPercent = Number(draft.qualityPercent);
      const timePercent = Number(draft.timePercent);
      if (!Number.isFinite(qualityPercent) || !Number.isFinite(timePercent)) {
        output[performer.userId] = null;
        continue;
      }
      output[performer.userId] = computeTaskPerformerFinalScore({
        baseScore: baseScoreNumeric,
        qualityPercent,
        timePercent,
      });
    }
    return output;
  }, [baseScoreNumeric, baseScoreValid, drafts, task.performers]);

  /** POST score payload to the task API. */
  async function handleSubmit(complete: boolean) {
    setSaving(true);
    try {
      await onSubmit({
        complete,
        baseScore: Number(baseScore),
        scores: task.performers.map((performer) => {
          const draft = drafts[performer.userId];
          return {
            userId: performer.userId,
            qualityPercent: Number(draft?.qualityPercent ?? 100),
            timePercent: Number(draft?.timePercent ?? 100),
          };
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  const baseMin = task.scoringCategory?.baseScoreMin;
  const baseMax = task.scoringCategory?.baseScoreMax;

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-md)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Score performers</h2>
        {task.scoringCategory ? (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Category: {task.scoringCategory.label}
            {baseMin != null && baseMax != null
              ? ` — base score (B) allowed ${baseMin}–${baseMax}`
              : ""}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Final score = B × (Q% ÷ 100) × (T% ÷ 100). Q and T are quality and time
          coefficients (0–200%). Admins can revise scores after the task is completed.
        </p>
      </div>

      <FormField
        label="Base score (B)"
        hint={
          baseMin != null && baseMax != null
            ? `Set the task value for this assignment (${baseMin}–${baseMax} for this category).`
            : "Set the task value for this assignment."
        }
        required
      >
        <Input
          type="number"
          min={baseMin ?? 0}
          max={baseMax ?? undefined}
          value={baseScore}
          onChange={(e) => setBaseScore(e.target.value)}
        />
      </FormField>

      {task.performers.map((performer) => {
        const draft = drafts[performer.userId];
        if (!draft) return null;
        const preview = previews[performer.userId];

        return (
          <div
            key={performer.userId}
            className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3"
          >
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {performer.displayName}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FormField label={`Quality coefficient Q (${TASK_COEFFICIENT_PERCENT_MIN}–${TASK_COEFFICIENT_PERCENT_MAX}%)`}>
                <Input
                  type="number"
                  min={TASK_COEFFICIENT_PERCENT_MIN}
                  max={TASK_COEFFICIENT_PERCENT_MAX}
                  value={draft.qualityPercent}
                  onChange={(e) =>
                    setDrafts((current) => ({
                      ...current,
                      [performer.userId]: { ...draft, qualityPercent: e.target.value },
                    }))
                  }
                />
              </FormField>
              <FormField label={`Time coefficient T (${TASK_COEFFICIENT_PERCENT_MIN}–${TASK_COEFFICIENT_PERCENT_MAX}%)`}>
                <Input
                  type="number"
                  min={TASK_COEFFICIENT_PERCENT_MIN}
                  max={TASK_COEFFICIENT_PERCENT_MAX}
                  value={draft.timePercent}
                  onChange={(e) =>
                    setDrafts((current) => ({
                      ...current,
                      [performer.userId]: { ...draft, timePercent: e.target.value },
                    }))
                  }
                />
              </FormField>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Final score: {preview != null ? preview : "—"}
            </p>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving || !baseScoreValid} onClick={() => void handleSubmit(true)}>
          Save scores &amp; complete
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !baseScoreValid}
          onClick={() => void handleSubmit(false)}
        >
          Save scores only
        </Button>
      </div>
    </div>
  );
}

export default TaskScorePanel;
