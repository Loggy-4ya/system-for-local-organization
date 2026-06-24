/**
 * @fileoverview Per-user page dislike records for Puck CMS pages.
 *
 * @module shared/models/PageDislike
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * A single user's dislike on a Puck-managed page.
 */
export interface IPageDislike extends Document {
  /** MongoDB page path key (e.g. `/news/spring-festival`). */
  pagePath: string;
  /** User who disliked the page. */
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PageDislikeSchema = new Schema<IPageDislike>(
  {
    pagePath: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "page_dislikes",
  },
);

PageDislikeSchema.index({ pagePath: 1, userId: 1 }, { unique: true });

/**
 * Page dislike model — one row per user per page path.
 */
const PageDislike: Model<IPageDislike> =
  mongoose.models.PageDislike ??
  mongoose.model<IPageDislike>("PageDislike", PageDislikeSchema);

export default PageDislike;
