/**
 * @fileoverview Institutional yearly calendar rule Mongoose schema.
 *
 * @module shared/models/InstitutionalCalendarRule
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import {
  DEFAULT_INSTITUTIONAL_CALENDAR_CHANNELS,
  DEFAULT_INSTITUTIONAL_TASK_TEMPLATE,
  INSTITUTIONAL_CALENDAR_ACTIONS,
  type InstitutionalCalendarAction,
  type InstitutionalCalendarTaskTemplate,
  type InstitutionalYearlyAnchor,
} from "@shared/constants/institutionalCalendar";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import type { SociumRoleKind } from "@shared/models/userTypes";

/** Persisted institutional yearly calendar rule. */
export interface IInstitutionalCalendarRule extends Document {
  /** Rule headline shown in admin UI and notifications. */
  title: string;
  /** Optional supporting description. */
  description: string;
  /** Whether the scheduler should fire this rule. */
  enabled: boolean;
  /** What happens when the rule fires. */
  action: InstitutionalCalendarAction;
  /** Yearly month/day/time anchors. */
  yearlyAnchors: InstitutionalYearlyAnchor[];
  /** Built-in socium kinds to include. */
  targetSociumKinds: SociumRoleKind[];
  /** Custom socium role keys to include. */
  targetSociumRoleKeys: string[];
  /** Access tiers to include. */
  targetAccessLevelIndexes: AccessLevelIndex[];
  /** Delivery channels for notify actions. */
  channels: TaskReminderChannel[];
  /** Task template when action includes task creation. */
  taskTemplate: InstitutionalCalendarTaskTemplate;
  /** Admin who authored the rule. */
  authorUserId: Types.ObjectId;
  /** Denormalized author label. */
  authorDisplayName: string;
  createdAt: Date;
  updatedAt: Date;
}

const YearlyAnchorSchema = new Schema<InstitutionalYearlyAnchor>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    atTime: { type: String, required: true, trim: true, default: "09:00" },
  },
  { _id: false },
);

const TaskTemplateSchema = new Schema<InstitutionalCalendarTaskTemplate>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true },
    dispatch: { type: Boolean, default: true },
  },
  { _id: false },
);

const InstitutionalCalendarRuleSchema = new Schema<IInstitutionalCalendarRule>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true },
    enabled: { type: Boolean, default: true, index: true },
    action: { type: String, enum: INSTITUTIONAL_CALENDAR_ACTIONS, default: "spawn_task_and_notify" },
    yearlyAnchors: { type: [YearlyAnchorSchema], default: [] },
    targetSociumKinds: { type: [String], default: [] },
    targetSociumRoleKeys: { type: [String], default: [] },
    targetAccessLevelIndexes: { type: [Number], default: [] },
    channels: {
      type: [String],
      enum: ["web", "telegram"],
      default: () => [...DEFAULT_INSTITUTIONAL_CALENDAR_CHANNELS],
    },
    taskTemplate: {
      type: TaskTemplateSchema,
      default: () => ({ ...DEFAULT_INSTITUTIONAL_TASK_TEMPLATE }),
    },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorDisplayName: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    collection: "institutional_calendar_rules",
  },
);

const InstitutionalCalendarRule: Model<IInstitutionalCalendarRule> =
  mongoose.models.InstitutionalCalendarRule ??
  mongoose.model<IInstitutionalCalendarRule>(
    "InstitutionalCalendarRule",
    InstitutionalCalendarRuleSchema,
  );

export default InstitutionalCalendarRule;
