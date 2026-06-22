/**
 * @fileoverview Zod schemas for self-government membership application APIs.
 *
 * @module shared/validation/membershipApplicationSchemas
 */

import { z } from "zod";
import { MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";

/** Query params for paginated membership application list. */
export const membershipApplicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).optional(),
  search: z.string().trim().max(120).optional(),
});

/** Body for rejecting a membership application. */
export const membershipApplicationRejectSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
