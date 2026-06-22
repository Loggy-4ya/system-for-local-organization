/**
 * @fileoverview Pure helpers for task group planned roster and performer union.
 *
 * @module shared/lib/taskGroupRosterLogic
 *
 * Tests: `npm run test:task-group-roster-logic`
 * Registry: `.ai/docs/testing.md`
 */

import { MAX_TASK_GROUP_ROSTER_SIZE } from "@shared/constants/taskSettings";

/**
 * Merge planned roster user ids with performer ids from child tasks.
 *
 * @param rosterUserIds - User ids declared on the project roster.
 * @param childTaskPerformerUserIds - Performer ids from attached task parts.
 * @returns Unique ascending user id strings.
 */
export function mergeGroupPerformerUserIds(
  rosterUserIds: string[],
  childTaskPerformerUserIds: string[],
): string[] {
  const seen = new Set<string>();

  for (const id of [...rosterUserIds, ...childTaskPerformerUserIds]) {
    const normalized = id.trim();
    if (!normalized) continue;
    seen.add(normalized);
  }

  return [...seen];
}

/**
 * Deduplicate roster inputs by user id while preserving first role label.
 *
 * @param rows - Incoming roster rows from API/UI.
 * @returns Unique rows capped at {@link MAX_TASK_GROUP_ROSTER_SIZE}.
 */
export function dedupeTaskGroupRosterInputs(
  rows: Array<{ userId: string; roleLabel?: string }>,
): Array<{ userId: string; roleLabel?: string }> {
  const seen = new Set<string>();
  const output: Array<{ userId: string; roleLabel?: string }> = [];

  for (const row of rows) {
    const userId = row.userId.trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    output.push({
      userId,
      roleLabel: row.roleLabel?.trim() || undefined,
    });
    if (output.length >= MAX_TASK_GROUP_ROSTER_SIZE) break;
  }

  return output;
}

/**
 * Build a short forum topic title from a task headline.
 *
 * @param taskTitle - Task title.
 * @returns Telegram-safe topic name (max 128 chars).
 */
export function formatTaskForumTopicTitle(taskTitle: string): string {
  const trimmed = taskTitle.trim();
  if (trimmed.length <= 128) return trimmed;
  return `${trimmed.slice(0, 125)}…`;
}
