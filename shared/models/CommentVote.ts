/**
 * @fileoverview Per-user like/dislike votes on community comments.
 *
 * @module shared/models/CommentVote
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** Vote polarity stored for a comment reaction. */
export type CommentVotePolarity = "like" | "dislike";

/**
 * A single user's reaction on a {@link UserComment} row.
 */
export interface ICommentVote extends Document {
  /** Target comment document id. */
  commentId: Types.ObjectId;
  /** User who cast the vote. */
  userId: Types.ObjectId;
  /** Like or dislike polarity. */
  vote: CommentVotePolarity;
  createdAt: Date;
  updatedAt: Date;
}

const CommentVoteSchema = new Schema<ICommentVote>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "UserComment",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vote: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "comment_votes",
  },
);

CommentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

/**
 * Comment vote model — one row per user per comment.
 */
const CommentVote: Model<ICommentVote> =
  mongoose.models.CommentVote ??
  mongoose.model<ICommentVote>("CommentVote", CommentVoteSchema);

export default CommentVote;
