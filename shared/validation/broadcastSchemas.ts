/**
 * @fileoverview Zod validation for system broadcast API payloads.
 *
 * @module shared/validation/broadcastSchemas
 */

import { z } from "zod";
import { BROADCAST_CHANNELS } from "@shared/constants/broadcastChannels";
import { contentPolicyPlainTextRefine } from "@shared/validation/contentPolicySchemas";

const broadcastChannelEnum = z.enum([
  BROADCAST_CHANNELS.web_toast,
  BROADCAST_CHANNELS.telegram_dm,
]);

/**
 * Schema for POST /api/admin/broadcasts.
 */
export const sendBroadcastSchema = z.object({
  title: z
    .string()
    .trim()
    .max(120, "Title must be under 120 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" || val === undefined ? null : val))
    .refine(
      (val) => val == null || contentPolicyPlainTextRefine.check(val),
      { message: contentPolicyPlainTextRefine.message },
    ),
  body: z
    .string()
    .trim()
    .min(1, "Message body is required.")
    .max(2000, "Message body must be under 2000 characters.")
    .refine(contentPolicyPlainTextRefine.check, {
      message: contentPolicyPlainTextRefine.message,
    }),
  variant: z.enum(["info", "success", "warning", "error"] as const).default("info"),
  channels: z.array(broadcastChannelEnum).min(1, "Select at least one delivery channel."),
  expiresAt: z
    .union([z.coerce.date(), z.null()])
    .optional()
    .transform((val) => val ?? null),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
