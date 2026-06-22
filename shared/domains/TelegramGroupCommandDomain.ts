/**
 * @fileoverview In-group Telegram bot commands for linked project workspaces.
 *
 * Handles `/status` and `/task_done` inside supergroups bound via {@link TelegramWorkspaceDomain}.
 *
 * @module shared/domains/TelegramGroupCommandDomain
 *
 * Tests: `npm run test:telegram-group-command-logic`
 */

import connectDB from "@shared/lib/db";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import {
  formatTelegramProjectStatusMessage,
  formatTelegramTaskDonePickerMessage,
  isOpenTelegramGroupTaskStatus,
  resolveTelegramTaskDoneTarget,
  type TelegramGroupTaskRow,
} from "@shared/lib/telegramGroupCommandLogic";
import { canSubmitTaskReport, type TaskActorSlice } from "@shared/lib/taskAccessLogic";
import Task from "@shared/models/Task";
import TaskGroup from "@shared/models/TaskGroup";
import User from "@shared/models/User";

/**
 * Resolve Nexus user + task actor from a Telegram sender id.
 *
 * @param telegramUserId - Telegram numeric user id.
 * @returns Actor slice or null when unregistered.
 */
async function resolveActorFromTelegramId(
  telegramUserId: number,
): Promise<TaskActorSlice | null> {
  const user = await User.findOne({ telegramId: telegramUserId });
  if (!user) return null;
  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  return buildTaskActor(user, permissions);
}

/**
 * Load the active project bound to a Telegram group chat.
 *
 * @param chatId - Telegram group chat id.
 * @returns Group id and title or null.
 */
async function findActiveProjectForChat(
  chatId: number,
): Promise<{ groupId: string; title: string } | null> {
  const doc = await TaskGroup.findOne({
    "telegramWorkspace.chatId": chatId,
    "telegramWorkspace.state": "active",
  }).select("title");

  if (!doc) return null;
  return { groupId: String(doc._id), title: doc.title };
}

/**
 * Load child tasks for a project group.
 *
 * @param groupId - MongoDB group id.
 * @returns Task rows for command handlers.
 */
async function loadProjectTaskRows(groupId: string): Promise<TelegramGroupTaskRow[]> {
  const docs = await Task.find({ groupId }).sort({ updatedAt: -1 }).select("title status").lean();
  return docs.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
  }));
}

/**
 * Telegram group command domain for linked project workspaces.
 */
export const TelegramGroupCommandDomain = {
  /**
   * Build `/status` reply for a linked group chat.
   *
   * @param chatId - Telegram group chat id.
   * @returns Message text or null when chat is not linked.
   */
  async buildStatusMessage(chatId: number): Promise<string | null> {
    await connectDB();
    const project = await findActiveProjectForChat(chatId);
    if (!project) return null;

    const tasks = await loadProjectTaskRows(project.groupId);
    return formatTelegramProjectStatusMessage(project.title, tasks);
  },

  /**
   * Submit a performer report via `/task_done` in a linked group.
   *
   * @param chatId - Telegram group chat id.
   * @param telegramUserId - Command sender Telegram id.
   * @param arg - Optional 1-based index or task id prefix.
   * @returns User-facing result message.
   */
  async handleTaskDone(
    chatId: number,
    telegramUserId: number,
    arg?: string,
  ): Promise<string> {
    await connectDB();

    const actor = await resolveActorFromTelegramId(telegramUserId);
    if (!actor) {
      return "Link your Telegram account in Nexus profile settings before using /task_done.";
    }

    const project = await findActiveProjectForChat(chatId);
    if (!project) {
      return "This group is not linked to an active Nexus project.";
    }

    const tasks = await loadProjectTaskRows(project.groupId);
    const openForPerformer: TelegramGroupTaskRow[] = [];

    for (const row of tasks) {
      if (!isOpenTelegramGroupTaskStatus(row.status)) continue;
      const doc = await Task.findById(row.id).select("authorUserId performers status delegationCount");
      if (!doc) continue;
      const slice = {
        authorUserId: String(doc.authorUserId),
        performerUserIds: (doc.performers ?? []).map((p) => String(p.userId)),
        status: doc.status,
        delegationCount: doc.delegationCount ?? 0,
      };
      if (canSubmitTaskReport(actor, slice)) {
        openForPerformer.push(row);
      }
    }

    const targetId = resolveTelegramTaskDoneTarget(openForPerformer, arg);
    if (!targetId) {
      return formatTelegramTaskDonePickerMessage(openForPerformer);
    }

    try {
      await TaskDomain.submitReport(actor, targetId, {
        description: "<p>Submitted via Telegram /task_done</p>",
        media: [],
      });
      const task = openForPerformer.find((row) => row.id === targetId);
      return task
        ? `Submitted «${task.title}» for review.`
        : "Task submitted for review.";
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "FORBIDDEN" || message === "NOT_A_PERFORMER") {
        return "You are not assigned to that part.";
      }
      if (message === "TASK_NOT_FOUND") {
        return "Task not found.";
      }
      return "Could not submit that part. Try again from the web app.";
    }
  },
};

export default TelegramGroupCommandDomain;
