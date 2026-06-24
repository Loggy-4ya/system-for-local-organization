/**
 * @fileoverview Zod schemas for personal notification inbox API routes.
 *
 * @module shared/validation/notificationInboxSchemas
 */

import { z } from "zod";
import { DEFAULT_NOTIFICATION_INBOX_PAGE_SIZE } from "@shared/constants/notificationInbox";
import { MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";

/** Query params for GET /api/notifications/inbox. */
export const notificationInboxListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_PAGE_SIZE)
    .optional()
    .default(DEFAULT_NOTIFICATION_INBOX_PAGE_SIZE),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

/** Parsed inbox list query. */
export type NotificationInboxListQuery = z.infer<typeof notificationInboxListQuerySchema>;
