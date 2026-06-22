/**
 * @fileoverview Unit tests for task group access-control pure helpers.
 *
 * Run: `npm run test:task-group-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskGroupAccessLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddTasksToGroup,
  canCreateTaskGroup,
  canEditTaskGroup,
  canListTaskGroups,
  canViewTaskGroup,
  type TaskGroupAccessSlice,
} from "@shared/lib/taskGroupAccessLogic";
import type { TaskActorSlice } from "@shared/lib/taskAccessLogic";

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

const activeGroup: TaskGroupAccessSlice = {
  authorUserId: "admin",
  status: "active",
  performerUserIds: ["student"],
};

describe("taskGroupAccessLogic", () => {
  it("allows dispatchers to create and list groups", () => {
    assert.equal(canCreateTaskGroup(dispatcher), true);
    assert.equal(canCreateTaskGroup(performer), false);
    assert.equal(canListTaskGroups(dispatcher), true);
    assert.equal(canListTaskGroups(performer), true);
  });

  it("allows author and child performers to view active groups", () => {
    assert.equal(canViewTaskGroup(dispatcher, activeGroup), true);
    assert.equal(canViewTaskGroup(performer, activeGroup), true);
    assert.equal(
      canViewTaskGroup({ ...performer, userId: "other" }, activeGroup),
      false,
    );
  });

  it("blocks adding tasks to completed groups", () => {
    const completed: TaskGroupAccessSlice = { ...activeGroup, status: "completed" };
    assert.equal(canAddTasksToGroup(dispatcher, completed), false);
    assert.equal(canAddTasksToGroup(dispatcher, activeGroup), true);
  });

  it("allows author to edit active groups", () => {
    assert.equal(canEditTaskGroup(dispatcher, activeGroup), true);
    assert.equal(
      canEditTaskGroup({ ...performer, userId: "admin" }, activeGroup),
      true,
    );
    assert.equal(canEditTaskGroup(performer, activeGroup), false);
  });
});
