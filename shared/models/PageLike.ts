/**
 * @fileoverview Per-user page like records for Puck CMS pages.
 *
 * @module shared/models/PageLike
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * A single user's like on a Puck-managed page.
 */
export interface IPageLike extends Document {
  /** MongoDB page path key (e.g. `/news/spring-festival`). */
  pagePath: string;
  /** User who liked the page. */
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PageLikeSchema = new Schema<IPageLike>(
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
    collection: "page_likes",
  },
);

PageLikeSchema.index({ pagePath: 1, userId: 1 }, { unique: true });

/**
 * Page like model — one row per user per page path.
 */
const PageLike: Model<IPageLike> =
  mongoose.models.PageLike ?? mongoose.model<IPageLike>("PageLike", PageLikeSchema);

export default PageLike;
