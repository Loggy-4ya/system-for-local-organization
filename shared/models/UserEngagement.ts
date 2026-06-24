/**
 * @fileoverview Community engagement models — comments, surveys, published content.
 *
 * Foundation schemas for Phase 5 News Hub and community interactions.
 * Profile pages query {@link UserPublishedContent} for eligible authors.
 *
 * @module shared/models/UserEngagement
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

/** Target content type for user comments. */
export type UserCommentTargetType = "news" | "proposal";

/** Survey vs quiz participation discriminator. */
export type ParticipationType = "survey" | "quiz";

/** Published community content type for profile feeds. */
export type PublishedContentType = "news" | "social_interactivity";

// ── User comments ─────────────────────────────────────────────────────────────

/**
 * A user comment on a news post or proposal.
 */
export interface IUserComment extends Document {
  /** Author user id. */
  userId: Types.ObjectId;
  /** Whether the comment targets news or a proposal. */
  targetType: UserCommentTargetType;
  /** Target document id (news slug, proposal id, etc.). */
  targetId: string;
  /** Parent comment id when this row is a reply; omitted for top-level comments. */
  parentCommentId?: Types.ObjectId | null;
  /** Comment body (sanitized rich text or plain text). */
  body: string;
  /** Denormalized like count from {@link CommentVote}. */
  likeCount: number;
  /** Denormalized dislike count from {@link CommentVote}. */
  dislikeCount: number;
  /** When true, the page author has hearted this comment (YouTube-style creator love). */
  authorHearted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserCommentSchema = new Schema<IUserComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["news", "proposal"], required: true },
    targetId: { type: String, required: true, trim: true, index: true },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "UserComment",
      default: null,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    authorHearted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: "user_comments" },
);

UserCommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
UserCommentSchema.index({ targetType: 1, targetId: 1, parentCommentId: 1, createdAt: -1 });
UserCommentSchema.index({ targetType: 1, targetId: 1, parentCommentId: 1, likeCount: -1, createdAt: -1 });
UserCommentSchema.index({ parentCommentId: 1, createdAt: 1 });

// ── Survey participation ──────────────────────────────────────────────────────

/**
 * Records a user's survey or quiz submission.
 */
export interface ISurveyParticipation extends Document {
  userId: Types.ObjectId;
  participationType: ParticipationType;
  /** Survey or quiz document id. */
  surveyId: string;
  /** Optional quiz id when participation is nested under a survey bundle. */
  quizId: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SurveyParticipationSchema = new Schema<ISurveyParticipation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participationType: { type: String, enum: ["survey", "quiz"], required: true },
    surveyId: { type: String, required: true, trim: true, index: true },
    quizId: { type: String, default: null, trim: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "survey_participations" },
);

SurveyParticipationSchema.index({ userId: 1, surveyId: 1 }, { unique: true });

// ── Published content feed ────────────────────────────────────────────────────

/**
 * News or social interactivity authored by a user with publish permission.
 *
 * Shown on `/profile` for eligible authors.
 */
export interface IUserPublishedContent extends Document {
  authorUserId: Types.ObjectId;
  contentType: PublishedContentType;
  title: string;
  /** URL path or slug to the published item. */
  href: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserPublishedContentSchema = new Schema<IUserPublishedContent>(
  {
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contentType: { type: String, enum: ["news", "social_interactivity"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    href: { type: String, required: true, trim: true, maxlength: 512 },
    publishedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, collection: "user_published_content" },
);

UserPublishedContentSchema.index({ authorUserId: 1, publishedAt: -1 });

// ── Model registration ────────────────────────────────────────────────────────

export const UserComment: Model<IUserComment> =
  mongoose.models.UserComment ??
  mongoose.model<IUserComment>("UserComment", UserCommentSchema);

export const SurveyParticipation: Model<ISurveyParticipation> =
  mongoose.models.SurveyParticipation ??
  mongoose.model<ISurveyParticipation>("SurveyParticipation", SurveyParticipationSchema);

export const UserPublishedContent: Model<IUserPublishedContent> =
  mongoose.models.UserPublishedContent ??
  mongoose.model<IUserPublishedContent>("UserPublishedContent", UserPublishedContentSchema);

export default UserComment;
