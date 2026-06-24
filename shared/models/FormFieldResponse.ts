/**
 * @fileoverview Persisted respondent answers for Puck form / survey / quiz fields.
 *
 * @module shared/models/FormFieldResponse
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { FormFieldGradingMode, FormFieldMode } from "@shared/constants/formField";

/**
 * One authenticated user's answer to a single {@link NexusInput} block on a page.
 */
export interface IFormFieldResponse extends Document {
  /** MongoDB page path key (e.g. `/surveys/q1`). */
  pagePath: string;
  /** Puck block id (`props.id`). */
  fieldId: string;
  /** Respondent user id. */
  userId: Types.ObjectId;
  /** Captured answer mode at submission time. */
  mode: FormFieldMode;
  /** Grading mode snapshot for choice fields. */
  gradingMode: FormFieldGradingMode;
  /** Open-text answer when mode is `text`. */
  textAnswer: string | null;
  /** Selected option ids when mode is `choice`. */
  selectedOptionIds: string[];
  /** Quiz grading result; null for surveys and text fields. */
  isCorrect: boolean | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldResponseSchema = new Schema<IFormFieldResponse>(
  {
    pagePath: { type: String, required: true, trim: true, index: true },
    fieldId: { type: String, required: true, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mode: { type: String, enum: ["text", "choice"], required: true },
    gradingMode: {
      type: String,
      enum: ["none", "single", "multiple"],
      required: true,
      default: "none",
    },
    textAnswer: { type: String, default: null, trim: true, maxlength: 2000 },
    selectedOptionIds: { type: [String], default: [] },
    isCorrect: { type: Boolean, default: null },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "form_field_responses" },
);

FormFieldResponseSchema.index({ pagePath: 1, fieldId: 1, userId: 1 }, { unique: true });
FormFieldResponseSchema.index({ pagePath: 1, fieldId: 1, submittedAt: -1 });

export const FormFieldResponse: Model<IFormFieldResponse> =
  mongoose.models.FormFieldResponse ??
  mongoose.model<IFormFieldResponse>("FormFieldResponse", FormFieldResponseSchema);

export default FormFieldResponse;
