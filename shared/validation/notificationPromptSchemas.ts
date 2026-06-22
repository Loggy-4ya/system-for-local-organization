/**
 * @fileoverview Validation for the post-auth web notification permission prompt API.
 *
 * @module shared/validation/notificationPromptSchemas
 */

import { z } from "zod";

/** POST body for recording the browser notification permission prompt outcome. */
export const webNotificationPromptSchema = z.object({
  outcome: z.enum(["enabled", "dismissed"]),
  browserPermission: z.enum(["granted", "denied", "default"]).optional(),
});

export type WebNotificationPromptInput = z.infer<typeof webNotificationPromptSchema>;
