/**
 * @fileoverview Pure access-control rules for the Nexus task engine.
 *
 * Tests: `npm run test:task-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/taskAccessLogic
 */

import type { AccessLevelIndex, PermissionKey } from "@shared/constants/accessControl";
import {
  DEFAULT_TASK_DELEGATION_LIMITS,
  type TaskStatus,
} from "@shared/constants/taskSettings";
import { hasPermission, inferAccessLevelIndex, type AccessControlUserSlice } from "@shared/lib/accessControlLogic";
import { isTaskStatusScoreable } from "@shared/lib/taskScoreLogic";

/** Minimal actor slice for task permission checks. */
export interface TaskActorSlice extends AccessControlUserSlice {
  /** MongoDB user id string. */
  userId: string;
  /** Resolved effective permissions for the actor. */
  permissions: PermissionKey[];
}

/** Minimal task slice for access checks. */
export interface TaskAccessSlice {
  /** Task author user id. */
  authorUserId: string;
  /** Assigned performer user ids. */
  performerUserIds: string[];
  /** Current lifecycle status. */
  status: TaskStatus;
  /** Number of delegation hops recorded on the task. */
  delegationCount: number;
}

/**
 * Whether the actor holds global task dispatch authority.
 *
 * @param actor - Authenticated user slice.
 * @returns True when the user may create tasks institution-wide.
 */
export function hasTaskDispatchAuthority(actor: TaskActorSlice): boolean {
  if (actor.role === "Admin") return true;
  return actor.permissions.includes("tasks.dispatch");
}

/**
 * Whether the actor is assigned as a performer on the task.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when the actor is a listed performer.
 */
export function isTaskPerformer(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  return task.performerUserIds.includes(actor.userId);
}

/**
 * Whether the actor is the task author.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when the actor created the task.
 */
export function isTaskAuthor(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  return task.authorUserId === actor.userId;
}

/**
 * Whether the actor may view a task detail row.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when task detail APIs and pages should allow access.
 */
export function canViewTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (hasTaskDispatchAuthority(actor)) return true;
  if (isTaskAuthor(actor, task)) return true;
  if (isTaskPerformer(actor, task)) return true;
  return actor.permissions.includes("tasks.receive");
}

/**
 * Whether the actor may create and dispatch new tasks.
 *
 * @param actor - Authenticated user slice.
 * @returns True when POST /api/tasks is permitted.
 */
export function canCreateTask(actor: TaskActorSlice): boolean {
  return hasTaskDispatchAuthority(actor);
}

/**
 * Whether the actor may edit task fields (title, due date, performers, etc.).
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when PATCH /api/tasks/[id] is permitted.
 */
export function canEditTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (task.status === "cancelled" || task.status === "completed") {
    return hasTaskDispatchAuthority(actor) && isTaskAuthor(actor, task);
  }
  return hasTaskDispatchAuthority(actor) || isTaskAuthor(actor, task);
}

/**
 * Whether the actor may acknowledge receipt of a dispatched task.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when POST acknowledge is permitted.
 */
export function canAcknowledgeTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (!isTaskPerformer(actor, task)) return false;
  return task.status === "dispatched" || task.status === "overdue";
}

/**
 * Whether the actor may mark a task as in progress (start work).
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when POST start is permitted.
 */
export function canStartTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (!isTaskPerformer(actor, task)) return false;
  return (
    task.status === "dispatched" ||
    task.status === "acknowledged" ||
    task.status === "overdue"
  );
}

/**
 * Whether the actor may reopen a completed task for redo.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when POST reopen is permitted.
 */
export function canReopenTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (!hasTaskDispatchAuthority(actor) && !isTaskAuthor(actor, task)) return false;
  return task.status === "completed";
}

/**
 * Whether the actor may submit a completion report for the task.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when POST report is permitted.
 */
export function canSubmitTaskReport(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (!isTaskPerformer(actor, task)) return false;
  return (
    task.status === "acknowledged" ||
    task.status === "in_progress" ||
    task.status === "overdue" ||
    task.status === "submitted" ||
    task.status === "completed"
  );
}

/**
 * Whether the actor may assign or revise performer scores (B, Q, T).
 *
 * Institution admins with `tasks.dispatch` may score after acknowledgement and
 * may update Q/T even when the task is already completed.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when POST score is permitted.
 */
export function canScoreTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  if (!hasTaskDispatchAuthority(actor)) return false;
  return isTaskStatusScoreable(task.status);
}

/**
 * Resolve the remaining delegation quota for an actor on a task chain.
 *
 * @param actorIndex - Actor hierarchy index.
 * @param delegationCount - Delegations already performed on the task.
 * @param limits - Optional persisted limits map (defaults to {@link DEFAULT_TASK_DELEGATION_LIMITS}).
 * @returns Remaining delegations, or `null` when unlimited.
 */
export function remainingTaskDelegationQuota(
  actorIndex: AccessLevelIndex,
  delegationCount: number,
  limits: Record<AccessLevelIndex, number | null> = DEFAULT_TASK_DELEGATION_LIMITS,
): number | null {
  const limit = limits[actorIndex];
  if (limit == null) return null;
  return Math.max(0, limit - delegationCount);
}

/**
 * Whether the actor may delegate/re-assign the task to another user.
 *
 * Performers with dispatch permission may delegate when their tier quota allows.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @param limits - Optional persisted delegation limits.
 * @returns True when POST delegate is permitted.
 */
export function canDelegateTask(
  actor: TaskActorSlice,
  task: TaskAccessSlice,
  limits: Record<AccessLevelIndex, number | null> = DEFAULT_TASK_DELEGATION_LIMITS,
): boolean {
  if (task.status === "cancelled" || task.status === "completed" || task.status === "draft") {
    return false;
  }

  const mayDispatch = hasTaskDispatchAuthority(actor);
  const isPerformer = isTaskPerformer(actor, task);
  const isAuthor = isTaskAuthor(actor, task);

  if (!mayDispatch && !isAuthor && !isPerformer) return false;

  const actorIndex = inferAccessLevelIndex(actor);
  const remaining = remainingTaskDelegationQuota(actorIndex, task.delegationCount, limits);
  if (remaining === null) return true;
  return remaining > 0;
}

/**
 * Whether the actor may cancel an open task.
 *
 * @param actor - Authenticated user slice.
 * @param task - Task ownership slice.
 * @returns True when DELETE/cancel is permitted.
 */
export function canCancelTask(actor: TaskActorSlice, task: TaskAccessSlice): boolean {
  return canEditTask(actor, task);
}

/**
 * Whether the actor may list tasks in the institutional task manager.
 *
 * @param actor - Authenticated user slice.
 * @returns True when GET /api/tasks list is permitted.
 */
export function canListTasks(actor: TaskActorSlice): boolean {
  if (hasTaskDispatchAuthority(actor)) return true;
  return actor.permissions.includes("tasks.receive");
}

/**
 * Whether the actor holds receive permission (for list filtering defaults).
 *
 * @param actor - Authenticated user slice.
 * @returns True when assigned-task views should include this user.
 */
export function canReceiveTasks(actor: TaskActorSlice): boolean {
  if (actor.role === "Admin") return true;
  return actor.permissions.includes("tasks.receive");
}