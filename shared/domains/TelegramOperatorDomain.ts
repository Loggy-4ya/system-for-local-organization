/**
 * @fileoverview MTProto operator provisioning and maintenance for Telegram project workspaces.
 *
 * Runs in the `telegram-worker` process — not in the Next.js serverless bundle.
 * Handles capabilities the Bot API cannot: create supergroups, enable forum topics,
 * invite members, promote the bot, and leave/delete groups on dismantle.
 *
 * @module shared/domains/TelegramOperatorDomain
 *
 * Tests: `npm run test:telegram-channel-id-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import type { TelegramOperatorPendingAction } from "@shared/constants/telegramWorkspace";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";
import {
  botChatIdToGramJsChannelId,
  extractTelegramInviteHash,
  gramJsChannelIdToBotChatId,
} from "@shared/lib/telegramChannelIdLogic";
import bigInt from "big-integer";
import type { EntityLike } from "telegram/define";
import {
  canAutoCreateTelegramGroups,
  interpolateTelegramWorkspaceTemplate,
  normalizeTaskGroupTelegramWorkspace,
  resolveTelegramWorkspaceStrategy,
} from "@shared/lib/telegramWorkspaceLogic";
import {
  isTelegramOperatorEnvConfigured,
  missingTelegramOperatorEnvKeys,
  readTelegramOperatorEnv,
} from "@shared/lib/telegramOperatorEnv";
import Task from "@shared/models/Task";
import TaskGroup from "@shared/models/TaskGroup";
import User from "@shared/models/User";

/** Result of processing one operator job. */
export interface TelegramOperatorJobResult {
  /** MongoDB group id. */
  groupId: string;
  /** Job kind processed. */
  kind: "provision" | TelegramOperatorPendingAction;
  /** Whether the job succeeded. */
  ok: boolean;
  /** Error message when failed. */
  error?: string;
}

/** Re-export for backward compatibility. */
export { gramJsChannelIdToBotChatId } from "@shared/lib/telegramChannelIdLogic";

/**
 * Collect distinct Telegram user ids for a project's roster and child tasks.
 *
 * @param groupId - MongoDB task group id.
 * @returns Telegram numeric user ids.
 */
async function collectProjectTelegramUserIds(groupId: string): Promise<number[]> {
  const doc = await TaskGroup.findById(groupId).lean();
  if (!doc) return [];

  const performerIds = new Set<string>();
  for (const member of doc.plannedRoster ?? []) {
    performerIds.add(String(member.userId));
  }

  const performerDocs = await Task.find({ groupId }).select("performers.userId").lean();
  for (const task of performerDocs) {
    for (const performer of task.performers ?? []) {
      performerIds.add(String(performer.userId));
    }
  }

  const users = await User.find({ _id: { $in: [...performerIds] } })
    .select("telegramId")
    .lean();

  return users
    .map((user) => user.telegramId)
    .filter((id): id is number => typeof id === "number" && id > 0);
}

/**
 * MTProto operator domain — polled by `scripts/telegramWorker.ts`.
 */
export const TelegramOperatorDomain = {
  /**
   * Whether the worker should run (operator env complete).
   *
   * @returns True when all required env vars are present.
   */
  isConfigured(): boolean {
    return isTelegramOperatorEnvConfigured() && canAutoCreateTelegramGroups();
  },

  /**
   * Missing env keys for admin/worker logs.
   *
   * @returns Variable names still required.
   */
  missingEnvKeys(): string[] {
    return missingTelegramOperatorEnvKeys();
  },

  /**
   * Claim and process pending provisioning and maintenance jobs.
   *
   * @param limit - Max groups per tick.
   * @returns Per-group results.
   */
  async processPendingJobs(limit = 5): Promise<TelegramOperatorJobResult[]> {
    if (!TelegramOperatorDomain.isConfigured()) {
      return [];
    }

    await connectDB();
    const provisionResults = await TelegramOperatorDomain.processPendingProvisioningJobs(limit);
    const remaining = Math.max(0, limit - provisionResults.length);
    const maintenanceResults =
      remaining > 0
        ? await TelegramOperatorDomain.processPendingMaintenanceJobs(remaining)
        : [];

    return [...provisionResults, ...maintenanceResults];
  },

  /**
   * Claim and process pending `user_session` provisioning jobs.
   *
   * @param limit - Max groups per tick.
   * @returns Per-group results.
   */
  async processPendingProvisioningJobs(limit = 3): Promise<TelegramOperatorJobResult[]> {
    if (!TelegramOperatorDomain.isConfigured()) {
      return [];
    }

    await connectDB();
    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const candidates = await TaskGroup.find({
      "telegramWorkspace.state": "provisioning",
    })
      .limit(limit)
      .sort({ updatedAt: 1 });

    const results: TelegramOperatorJobResult[] = [];

    for (const doc of candidates) {
      const groupId = String(doc._id);
      const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
      const resolved = resolveTelegramWorkspaceStrategy(workspace.strategy, settings);

      if (resolved !== "user_session") {
        continue;
      }

      try {
        await TelegramOperatorDomain.provisionGroup(groupId);
        results.push({ groupId, kind: "provision", ok: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Provision failed.";
        await TelegramWorkspaceDomain.markOperatorProvisionFailed(groupId, error);
        results.push({ groupId, kind: "provision", ok: false, error });
      }
    }

    return results;
  },

  /**
   * Process queued MTProto maintenance jobs on active or dismantling workspaces.
   *
   * @param limit - Max jobs per tick.
   * @returns Per-group results.
   */
  async processPendingMaintenanceJobs(limit = 3): Promise<TelegramOperatorJobResult[]> {
    if (!TelegramOperatorDomain.isConfigured()) {
      return [];
    }

    await connectDB();
    const candidates = await TaskGroup.find({
      "telegramWorkspace.operatorPendingAction": { $ne: null },
      "telegramWorkspace.chatId": { $ne: null },
    })
      .limit(limit)
      .sort({ updatedAt: 1 });

    const results: TelegramOperatorJobResult[] = [];

    for (const doc of candidates) {
      const groupId = String(doc._id);
      const workspace = normalizeTaskGroupTelegramWorkspace(doc.telegramWorkspace);
      const action = workspace.operatorPendingAction;
      if (!action || workspace.chatId == null) continue;

      try {
        await TelegramOperatorDomain.runMaintenanceAction(groupId, action);
        results.push({ groupId, kind: action, ok: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Operator maintenance failed.";
        await TelegramWorkspaceDomain.markOperatorMaintenanceFailed(groupId, error);
        results.push({ groupId, kind: action, ok: false, error });
      }
    }

    return results;
  },

  /**
   * Execute one maintenance action for an active workspace.
   *
   * @param groupId - MongoDB task group id.
   * @param action - Maintenance job type.
   */
  async runMaintenanceAction(
    groupId: string,
    action: TelegramOperatorPendingAction,
  ): Promise<void> {
    if (action === "enable_forum") {
      await TelegramOperatorDomain.enableForumForGroup(groupId);
      return;
    }
    if (action === "sync_members") {
      await TelegramOperatorDomain.syncMembersForGroup(groupId);
      return;
    }
    if (action === "dismantle") {
      await TelegramOperatorDomain.dismantleGroupAsOperator(groupId);
      return;
    }
  },

  /**
   * Create a Telegram supergroup for one project via MTProto.
   *
   * @param groupId - MongoDB task group id.
   */
  async provisionGroup(groupId: string): Promise<void> {
    const env = readTelegramOperatorEnv();
    if (!isTelegramOperatorEnvConfigured(env)) {
      throw new Error(`Missing operator env: ${missingTelegramOperatorEnvKeys(env).join(", ")}`);
    }

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc) throw new Error("GROUP_NOT_FOUND");

    const settings = await TelegramWorkspaceDomain.loadOrSeedSettings();
    const title = interpolateTelegramWorkspaceTemplate(settings.groupTitleTemplate, {
      title: doc.title,
      groupId,
      linkToken: doc.telegramWorkspace?.linkToken ?? null,
      projectUrl: null,
    });

    const telegramUserIds = await collectProjectTelegramUserIds(groupId);

    const apiId = Number.parseInt(env.apiId!, 10);
    const apiHash = env.apiHash!;
    const session = env.operatorSession!;
    const botToken = env.botToken!;

    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
    const { Api } = await import("telegram");

    const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
      connectionRetries: 3,
    });

    await client.connect();

    try {
      const created = await client.invoke(
        new Api.channels.CreateChannel({
          title,
          about: "Nexus project workspace",
          megagroup: true,
        }),
      );

      const updates = created as import("telegram").Api.Updates;
      const channel = updates.chats?.[0];
      if (!channel || !("id" in channel)) {
        throw new Error("CreateChannel returned no chat.");
      }

      let forumEnabled = false;
      try {
        await client.invoke(
          new Api.channels.ToggleForum({
            channel,
            enabled: true,
          }),
        );
        forumEnabled = true;
      } catch {
        // Queue a follow-up maintenance job if forum toggle fails at create time.
      }

      const chatId = gramJsChannelIdToBotChatId(
        typeof channel.id === "object" && channel.id !== null && "toString" in channel.id
          ? Number(channel.id.toString())
          : Number(channel.id),
      );
      const chatTitle = "title" in channel && channel.title ? String(channel.title) : title;

      await TelegramOperatorDomain.inviteUsersToChannel(client, Api, channel, telegramUserIds);
      await TelegramOperatorDomain.inviteAndPromoteBot(client, Api, channel, botToken);

      const chatMeta = await TelegramBotDomain.getChat(botToken, chatId);
      const inviteLink = chatMeta.invite_link ?? null;
      forumEnabled = forumEnabled || Boolean(chatMeta.is_forum);

      await TelegramWorkspaceDomain.completeOperatorProvision(groupId, {
        chatId,
        chatTitle,
        inviteLink,
        forumEnabled,
      });

      if (!forumEnabled && settings.createForumTopicPerTask) {
        await TelegramWorkspaceDomain.queueOperatorAction(groupId, "enable_forum");
      }
    } finally {
      await client.disconnect();
    }
  },

  /**
   * Enable forum topics on an existing linked supergroup.
   *
   * @param groupId - MongoDB task group id.
   */
  async enableForumForGroup(groupId: string): Promise<void> {
    const env = readTelegramOperatorEnv();
    if (!isTelegramOperatorEnvConfigured(env)) {
      throw new Error("OPERATOR_NOT_CONFIGURED");
    }

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc?.telegramWorkspace?.chatId) throw new Error("WORKSPACE_NOT_LINKED");

    const chatId = doc.telegramWorkspace.chatId;
    const botToken = env.botToken!;

    await TelegramOperatorDomain.withOperatorClient(async (client, Api) => {
      const channel = await TelegramOperatorDomain.resolveChannelEntity(client, Api, chatId);
      await TelegramOperatorDomain.ensureOperatorMembership(
        client,
        Api,
        channel,
        doc.telegramWorkspace?.inviteLink,
      );

      await client.invoke(
        new Api.channels.ToggleForum({
          channel,
          enabled: true,
        }),
      );
    });

    const chatMeta = await TelegramBotDomain.getChat(botToken, chatId);
    const forumEnabled = Boolean(chatMeta.is_forum);

    if (!forumEnabled) {
      throw new Error(
        "Could not enable forum topics — ensure the Nexus operator account is a group admin.",
      );
    }

    await TelegramWorkspaceDomain.completeOperatorMaintenance(groupId, {
      forumEnabled: true,
      clearAction: true,
    });
    await TelegramWorkspaceDomain.syncPendingTaskForumTopicsForGroup(groupId);
    await TelegramWorkspaceDomain.syncOperatorMembersForGroup(groupId);
  },

  /**
   * Invite roster and task performers who are not yet in the linked group.
   *
   * @param groupId - MongoDB task group id.
   */
  async syncMembersForGroup(groupId: string): Promise<void> {
    const env = readTelegramOperatorEnv();
    if (!isTelegramOperatorEnvConfigured(env)) {
      throw new Error("OPERATOR_NOT_CONFIGURED");
    }

    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc?.telegramWorkspace?.chatId) throw new Error("WORKSPACE_NOT_LINKED");

    const chatId = doc.telegramWorkspace.chatId;
    const telegramUserIds = await collectProjectTelegramUserIds(groupId);

    await TelegramOperatorDomain.withOperatorClient(async (client, Api) => {
      const channel = await TelegramOperatorDomain.resolveChannelEntity(client, Api, chatId);
      await TelegramOperatorDomain.ensureOperatorMembership(
        client,
        Api,
        channel,
        doc.telegramWorkspace?.inviteLink,
      );
      await TelegramOperatorDomain.inviteUsersToChannel(client, Api, channel, telegramUserIds);
    });

    await TelegramWorkspaceDomain.completeOperatorMaintenance(groupId, { clearAction: true });
  },

  /**
   * Leave or delete a supergroup as the operator account after project completion.
   *
   * @param groupId - MongoDB task group id.
   */
  async dismantleGroupAsOperator(groupId: string): Promise<void> {
    await connectDB();
    const doc = await TaskGroup.findById(groupId);
    if (!doc?.telegramWorkspace?.chatId) {
      await TelegramWorkspaceDomain.completeOperatorMaintenance(groupId, {
        clearAction: true,
        closeWorkspace: true,
      });
      return;
    }

    const chatId = doc.telegramWorkspace.chatId;

    try {
      await TelegramOperatorDomain.withOperatorClient(async (client, Api) => {
        const channel = await TelegramOperatorDomain.resolveChannelEntity(client, Api, chatId);
        try {
          await client.invoke(
            new Api.channels.DeleteChannel({
              channel,
            }),
          );
        } catch {
          await client.invoke(
            new Api.channels.LeaveChannel({
              channel,
            }),
          );
        }
      });
    } catch {
      // Group may already be gone — still mark workspace closed.
    }

    await TelegramWorkspaceDomain.completeOperatorMaintenance(groupId, {
      clearAction: true,
      closeWorkspace: true,
    });
  },

  /**
   * Open a short-lived MTProto client session for one maintenance action.
   *
   * @param callback - Async work using the connected client.
   */
  async withOperatorClient(
    callback: (
      client: import("telegram").TelegramClient,
      Api: typeof import("telegram").Api,
    ) => Promise<void>,
  ): Promise<void> {
    const env = readTelegramOperatorEnv();
    if (!isTelegramOperatorEnvConfigured(env)) {
      throw new Error("OPERATOR_NOT_CONFIGURED");
    }

    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
    const { Api } = await import("telegram");

    const client = new TelegramClient(
      new StringSession(env.operatorSession!),
      Number.parseInt(env.apiId!, 10),
      env.apiHash!,
      { connectionRetries: 3 },
    );

    await client.connect();
    try {
      await callback(client, Api);
    } finally {
      await client.disconnect();
    }
  },

  /**
   * Resolve a supergroup channel input entity from a Bot API chat id.
   *
   * @param client - Connected MTProto client.
   * @param Api - GramJS API namespace.
   * @param chatId - Bot API supergroup chat id.
   * @returns Channel input entity.
   */
  async resolveChannelEntity(
    client: import("telegram").TelegramClient,
    Api: typeof import("telegram").Api,
    chatId: number,
  ): Promise<EntityLike> {
    const channelId = botChatIdToGramJsChannelId(chatId);
    return client.getInputEntity(
      new Api.PeerChannel({
        channelId: bigInt(channelId.toString()),
      }),
    );
  },

  /**
   * Join a supergroup via invite link when the operator is not yet a member.
   *
   * @param client - Connected MTProto client.
   * @param Api - GramJS API namespace.
   * @param channel - Channel entity (used after join to re-resolve).
   * @param inviteLink - Stored public invite link.
   */
  async ensureOperatorMembership(
    client: import("telegram").TelegramClient,
    Api: typeof import("telegram").Api,
    channel: EntityLike,
    inviteLink?: string | null,
  ): Promise<void> {
    try {
      await client.getEntity(channel);
      return;
    } catch {
      // Not a member yet — try invite link.
    }

    const hash = inviteLink ? extractTelegramInviteHash(inviteLink) : null;
    if (!hash) {
      throw new Error(
        "Operator is not in the group and no invite link is available — add the operator account as admin.",
      );
    }

    await client.invoke(new Api.messages.ImportChatInvite({ hash }));
  },

  /**
   * Invite institution members into a channel via MTProto.
   *
   * @param client - Connected MTProto client.
   * @param Api - GramJS API namespace.
   * @param channel - Target channel.
   * @param telegramUserIds - Telegram numeric user ids.
   */
  async inviteUsersToChannel(
    client: import("telegram").TelegramClient,
    Api: typeof import("telegram").Api,
    channel: EntityLike,
    telegramUserIds: number[],
  ): Promise<void> {
    if (telegramUserIds.length === 0) return;

    const inviteEntities = [];
    for (const userId of telegramUserIds) {
      try {
        inviteEntities.push(await client.getInputEntity(userId));
      } catch {
        // Performer must be reachable by the operator account.
      }
    }

    if (inviteEntities.length === 0) return;

    await client.invoke(
      new Api.channels.InviteToChannel({
        channel,
        users: inviteEntities,
      }),
    );
  },

  /**
   * Add the Nexus bot to a channel and grant admin rights for forum topics and commands.
   *
   * @param client - Connected MTProto client.
   * @param Api - GramJS API namespace.
   * @param channel - Target channel.
   * @param botToken - BotFather token.
   */
  async inviteAndPromoteBot(
    client: import("telegram").TelegramClient,
    Api: typeof import("telegram").Api,
    channel: EntityLike,
    botToken: string,
  ): Promise<void> {
    const botMe = (await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((res) =>
      res.json(),
    )) as { result?: { id?: number; username?: string } };

    if (!botMe.result?.username) return;

    try {
      const botEntity = await client.getInputEntity(botMe.result.username);
      await client.invoke(
        new Api.channels.InviteToChannel({
          channel,
          users: [botEntity],
        }),
      );

      await client.invoke(
        new Api.channels.EditAdmin({
          channel,
          userId: botEntity,
          adminRights: new Api.ChatAdminRights({
            changeInfo: true,
            postMessages: true,
            editMessages: true,
            deleteMessages: true,
            banUsers: true,
            inviteUsers: true,
            pinMessages: true,
            addAdmins: false,
            manageCall: true,
            other: true,
            manageTopics: true,
          }),
          rank: "Nexus Bot",
        }),
      );
    } catch {
      // Bot promotion may require the bot to join via invite link first on some accounts.
    }
  },
};

export default TelegramOperatorDomain;
