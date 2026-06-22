/**
 * @fileoverview Pure access-control rules for task groups (multi-part projects).
 *
 * Tests: `npm run test:task-group-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/taskGroupAccessLogic
 */

import type { TaskGroupStatus } from "@shared/constants/taskSettings";
import {
  canCreateTask,
  canViewTask,
  hasTaskDispatchAuthority,
  type TaskActorSlice,
} from "@shared/lib/taskAccessLogic";

/** Minimal task group slice for access checks. */
export interface TaskGroupAccessSlice {
  authorUserId: string;
  status: TaskGroupStatus;
  /** Performer ids aggregated from child tasks. */
  performerUserIds: string[];
}

/**
 * Whether the actor may list and open task groups.
 *
 * @param actor - Authenticated user slice.
 * @returns True when group APIs are permitted.
 */
export function canListTaskGroups(actor: TaskActorSlice): boolean {
  return canCreateTask(actor) || actor.permissions.includes("tasks.receive");
}

/**
 * Whether the actor may create task groups.
 *
 * @param actor - Authenticated user slice.
 * @returns True when POST /api/task-groups is permitted.
 */
export function canCreateTaskGroup(actor: TaskActorSlice): boolean {
  return canCreateTask(actor);
}

/**
 * Whether the actor may view a task group detail page.
 *
 * @param actor - Authenticated user slice.
 * @param group - Group ownership slice.
 * @returns True when detail APIs should allow access.
 */
export function canViewTaskGroup(actor: TaskActorSlice, group: TaskGroupAccessSlice): boolean {
  if (hasTaskDispatchAuthority(actor)) return true;
  if (group.authorUserId === actor.userId) return true;
  if (group.performerUserIds.includes(actor.userId)) return true;
  return false;
}

/**
 * Whether the actor may edit a task group.
 *
 * @param actor - Authenticated user slice.
 * @param group - Group ownership slice.
 * @returns True when PATCH is permitted.
 */
export function canEditTaskGroup(actor: TaskActorSlice, group: TaskGroupAccessSlice): boolean {
  if (group.status === "cancelled" || group.status === "completed") {
    return hasTaskDispatchAuthority(actor) && group.authorUserId === actor.userId;
  }
  return hasTaskDispatchAuthority(actor) || group.authorUserId === actor.userId;
}

/**
 * Whether the actor may attach new child tasks to a group.
 *
 * @param actor - Authenticated user slice.
 * @param group - Group ownership slice.
 * @returns True when tasks may reference the group id.
 */
export function canAddTasksToGroup(actor: TaskActorSlice, group: TaskGroupAccessSlice): boolean {
  if (group.status === "cancelled" || group.status === "completed") return false;
  return canEditTaskGroup(actor, group);
}

/**
 * Whether viewing a child task implies group visibility for the actor.
 *
 * @param actor - Authenticated user slice.
 * @param taskAuthorUserId - Child task author id.
 * @param performerUserIds - Child task performer ids.
 * @returns True when {@link canViewTask} passes for a synthetic task slice.
 */
export function canViewTaskGroupViaChildTask(
  actor: TaskActorSlice,
  taskAuthorUserId: string,
  performerUserIds: string[],
): boolean {
  return canViewTask(actor, {
    authorUserId: taskAuthorUserId,
    performerUserIds,
    status: "dispatched",
    delegationCount: 0,
  });
}
