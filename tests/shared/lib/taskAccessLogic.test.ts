/**
 * @fileoverview Unit tests for task access-control pure helpers.
 *
 * Run: `npm run test:task-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskAccessLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCreateTask,
  canDelegateTask,
  canReopenTask,
  canScoreTask,
  canStartTask,
  canViewTask,
  remainingTaskDelegationQuota,
  type TaskActorSlice,
} from "@shared/lib/taskAccessLogic";

const dispatcher: TaskActorSlice = {
  userId: "admin",
  role: "StudentCouncil",
  accessLevelIndex: 1,
  delegatedPermissions: [],
  sociumRoles: [],
  studentTitle: null,
  permissions: ["tasks.dispatch", "tasks.receive"],
};

const performer: TaskActorSlice = {
  userId: "student",
  role: "Student",
  accessLevelIndex: 6,
  delegatedPermissions: [],
  sociumRoles: [],
  studentTitle: null,
  permissions: ["tasks.receive"],
};

describe("taskAccessLogic", () => {
  it("allows dispatchers to create tasks", () => {
    assert.equal(canCreateTask(dispatcher), true);
    assert.equal(canCreateTask(performer), false);
  });

  it("allows author and performers to view tasks", () => {
    const task = {
      authorUserId: "admin",
      performerUserIds: ["student"],
      status: "dispatched" as const,
      delegationCount: 0,
    };
    assert.equal(canViewTask(dispatcher, task), true);
    assert.equal(canViewTask(performer, task), true);
  });

  it("enforces delegation quota by access level", () => {
    assert.equal(remainingTaskDelegationQuota(6, 0), 0);
    assert.equal(remainingTaskDelegationQuota(3, 1), 2);
    assert.equal(remainingTaskDelegationQuota(0, 5), null);
    assert.equal(
      canDelegateTask(performer, {
        authorUserId: "admin",
        performerUserIds: ["student"],
        status: "dispatched",
        delegationCount: 0,
      }),
      false,
    );
  });

  it("allows performers to start work from dispatched or acknowledged", () => {
    const base = {
      authorUserId: "admin",
      performerUserIds: ["student"],
      delegationCount: 0,
    };
    assert.equal(canStartTask(performer, { ...base, status: "dispatched" }), true);
    assert.equal(canStartTask(performer, { ...base, status: "acknowledged" }), true);
    assert.equal(canStartTask(performer, { ...base, status: "in_progress" }), false);
    assert.equal(canStartTask(dispatcher, { ...base, status: "dispatched" }), false);
  });

  it("allows authors to reopen completed tasks", () => {
    const task = {
      authorUserId: "admin",
      performerUserIds: ["student"],
      status: "completed" as const,
      delegationCount: 0,
    };
    assert.equal(canReopenTask(dispatcher, task), true);
    assert.equal(
      canReopenTask(
        { ...dispatcher, userId: "admin", permissions: ["tasks.dispatch"] },
        task,
      ),
      true,
    );
    assert.equal(canReopenTask(performer, task), false);
  });

  it("allows dispatch admins to score including completed tasks", () => {
    const open = {
      authorUserId: "teacher",
      performerUserIds: ["student"],
      status: "submitted" as const,
      delegationCount: 0,
    };
    const done = { ...open, status: "completed" as const };
    assert.equal(canScoreTask(dispatcher, open), true);
    assert.equal(canScoreTask(dispatcher, done), true);
    assert.equal(canScoreTask(performer, open), false);
    assert.equal(
      canScoreTask(
        { ...dispatcher, userId: "teacher", permissions: ["tasks.receive"] },
        open,
      ),
      false,
    );
  });
});
