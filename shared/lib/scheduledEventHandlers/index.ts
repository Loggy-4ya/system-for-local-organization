/**
 * @fileoverview Scheduled event handlers registry stub.
 *
 * Handlers register themselves here. In this scaffold-only v1, this module is a
 * placeholder registry. Future handlers (e.g., page publishing, reminders) will
 * be wired up here.
 *
 * @module shared/lib/scheduledEventHandlers/index
 */

import type { ISystemScheduledEvent } from "@shared/models/SystemScheduledEvent";

/** Signature for any background scheduled event handler. */
export type ScheduledEventHandler = (
  payload: Record<string, any>,
  event: ISystemScheduledEvent,
) => Promise<void> | void;

/**
 * Register all scheduled event handlers with the SchedulerDomain.
 *
 * Scaffold-only v1: no-op since no handlers are implemented yet.
 */
export function registerScheduledEventHandlers(): void {
  // Future handler registrations go here:
  // SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.publish_page, publishPageHandler);
}
