/**
 * @fileoverview Handler for scheduled Puck page publishing.
 *
 * @module shared/lib/scheduledEventHandlers/handlePublishPage
 */

import { PageDomain } from "@shared/domains/PageDomain";

/**
 * Execute a deferred page publish when `publishAt` is reached.
 *
 * @param payload - Scheduler payload — must include `path`.
 */
export async function handlePublishPage(payload: Record<string, unknown>): Promise<void> {
  const path = typeof payload.path === "string" ? payload.path.trim() : "";
  if (!path) {
    throw new Error("publish_page payload requires a non-empty path.");
  }
  await PageDomain.executeScheduledPublish(path);
}
