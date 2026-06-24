"use client";

/**
 * @fileoverview Read-only statistics panel for Puck form / survey / quiz fields.
 *
 * @module src/components/puck/fields/FormFieldStatsPanelField
 */

import { useEffect, useState } from "react";
import { FieldLabel } from "@puckeditor/core";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { useNexusPuck } from "../lib/useNexusPuck";
import { fetchFormFieldStats, type FormFieldStatsResult } from "@/lib/formFieldClient";
import { isQuizGradingMode } from "@shared/lib/formFieldLogic";

/** Props passed by Puck to the statistics custom field. */
interface FormFieldStatsPanelFieldProps {
  field: { label?: string };
}

/**
 * Author-only statistics chapter — loads aggregates when the page is persisted.
 *
 * @param props - Puck custom field props.
 * @returns Stats summary UI.
 */
export function FormFieldStatsPanelField({ field }: FormFieldStatsPanelFieldProps) {
  const meta = usePageEditorMeta();
  const fieldId = useNexusPuck((state) => state.selectedItem?.props.id as string | undefined);
  const [stats, setStats] = useState<FormFieldStatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!meta.isPersisted || !meta.path || !fieldId) {
      setStats(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchFormFieldStats(meta.path, fieldId)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStats(null);
          setError(err instanceof Error ? err.message : "Failed to load statistics.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meta.isPersisted, meta.path, fieldId]);

  if (!meta.isPersisted) {
    return (
      <FieldLabel label={field.label ?? "Statistics"}>
        <p className="m-0 text-xs text-(--color-text-secondary)">
          Save and publish this page to collect responses and view statistics here.
        </p>
      </FieldLabel>
    );
  }

  if (loading) {
    return (
      <FieldLabel label={field.label ?? "Statistics"}>
        <p className="m-0 text-xs text-(--color-text-secondary)">Loading statistics…</p>
      </FieldLabel>
    );
  }

  if (error) {
    return (
      <FieldLabel label={field.label ?? "Statistics"}>
        <p className="m-0 text-xs text-(--color-danger)">{error}</p>
      </FieldLabel>
    );
  }

  if (!stats) {
    return (
      <FieldLabel label={field.label ?? "Statistics"}>
        <p className="m-0 text-xs text-(--color-text-secondary)">No statistics available.</p>
      </FieldLabel>
    );
  }

  return (
    <FieldLabel label={field.label ?? "Statistics"}>
      <div className="flex flex-col gap-3 text-xs text-(--color-text-primary)">
        <div className="glass-panel rounded-md border border-border bg-(--color-bg-panel) p-3">
          <p className="m-0 font-medium">{stats.totalResponses} responses</p>
          {isQuizGradingMode(stats.gradingMode as "none" | "single" | "multiple") &&
          stats.quizCorrectRate !== null ? (
            <p className="m-0 mt-1 text-(--color-text-secondary)">
              Quiz correctness: {stats.quizCorrectRate}% ({stats.quizCorrectCount} correct,{" "}
              {stats.quizIncorrectCount} incorrect)
            </p>
          ) : null}
        </div>

        {stats.mode === "choice" && stats.optionStats.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {stats.optionStats.map((row) => (
              <li
                key={row.optionId}
                className="glass-panel rounded-md border border-border bg-(--color-bg-panel) p-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-(--color-text-secondary)">
                    {row.count} ({row.percentage}%)
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-(--color-bg-cell)"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {stats.mode === "text" && stats.textAnswers.length > 0 ? (
          <ul className="m-0 flex max-h-48 list-none flex-col gap-2 overflow-y-auto p-0">
            {stats.textAnswers.slice(0, 20).map((answer, index) => (
              <li
                key={`${index}-${answer.slice(0, 24)}`}
                className="glass-panel rounded-md border border-border bg-(--color-bg-panel) p-2 text-(--color-text-secondary)"
              >
                {answer}
              </li>
            ))}
            {stats.textAnswers.length > 20 ? (
              <li className="text-(--color-text-secondary)">
                +{stats.textAnswers.length - 20} more answers
              </li>
            ) : null}
          </ul>
        ) : null}

        {stats.totalResponses === 0 ? (
          <p className="m-0 text-(--color-text-secondary)">
            No responses yet. Share the published page to start collecting answers.
          </p>
        ) : null}
      </div>
    </FieldLabel>
  );
}

export default FormFieldStatsPanelField;
