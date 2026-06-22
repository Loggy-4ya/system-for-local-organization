/**
 * @fileoverview Scheduled event handlers registry.
 *
 * @module shared/lib/scheduledEventHandlers/index
 */

import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import type { ISystemScheduledEvent } from "@shared/models/SystemScheduledEvent";
import { handlePublishPage } from "./handlePublishPage";
import { handleTaskOverdue } from "./handleTaskOverdue";
import { handleInstitutionalCalendar } from "./handleInstitutionalCalendar";
import { handleTaskGroupReminder } from "./handleTaskGroupReminder";
import { handleTaskReminder } from "./handleTaskReminder";
import { handleTelegramWorkspaceDismantle } from "./handleTelegramWorkspaceDismantle";
import { handleTelegramWorkspaceProvision } from "./handleTelegramWorkspaceProvision";

/** Signature for any background scheduled event handler. */
export type ScheduledEventHandler = (
  payload: Record<string, unknown>,
  event: ISystemScheduledEvent,
) => Promise<void> | void;

/**
 * Register all scheduled event handlers with the SchedulerDomain.
 */
export function registerScheduledEventHandlers(): void {
  SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.publish_page, handlePublishPage);
  SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.task_reminder, handleTaskReminder);
  SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.task_group_reminder, handleTaskGroupReminder);
  SchedulerDomain.registerHandler(
    SCHEDULED_EVENT_TYPES.institutional_calendar,
    handleInstitutionalCalendar,
  );
  SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.task_overdue, handleTaskOverdue);
  SchedulerDomain.registerHandler(
    SCHEDULED_EVENT_TYPES.telegram_workspace_provision,
    handleTelegramWorkspaceProvision,
  );
  SchedulerDomain.registerHandler(
    SCHEDULED_EVENT_TYPES.telegram_workspace_dismantle,
    handleTelegramWorkspaceDismantle,
  );
}
