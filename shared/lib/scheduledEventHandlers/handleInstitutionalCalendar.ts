/**
 * @fileoverview Handler for institutional yearly calendar scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleInstitutionalCalendar
 */

import { InstitutionalCalendarDomain } from "@shared/domains/InstitutionalCalendarDomain";

/**
 * Execute an institutional calendar rule fire and reschedule the next year.
 *
 * @param payload - Scheduler payload — must include `ruleId`.
 */
export async function handleInstitutionalCalendar(
  payload: Record<string, unknown>,
): Promise<void> {
  const ruleId = typeof payload.ruleId === "string" ? payload.ruleId.trim() : "";
  if (!ruleId) {
    throw new Error("institutional_calendar payload requires a non-empty ruleId.");
  }
  await InstitutionalCalendarDomain.executeRule(ruleId);
}
