/**
 * @fileoverview Puck.js Page Mongoose schema for Project Nexus.
 *
 * Each document stores the declarative layout JSON produced by Puck's visual
 * editor for a single URL path. The `path` field is the unique lookup key used
 * by the catch-all Next.js route to hydrate pages on demand.
 *
 * @module shared/models/Page
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

// ── Document Interface ────────────────────────────────────────────────────────

/**
 * The minimal Puck data envelope required for serialisation.
 * Full Puck typings are defined by `@puckeditor/core`.
 */
export interface PuckData {
  /** Ordered array of block instances placed on the page canvas. */
  content: unknown[];
  /** Map of named drop-zone slot arrays. */
  zones: Record<string, unknown[]>;
}

/**
 * TypeScript representation of a persisted Page document.
 *
 * @see {@link PageSchema} for the matching Mongoose schema definition.
 */
export interface IPage extends Document {
  /**
   * URL path this document corresponds to, e.g. `"/news"`, `"/about"`.
   * Used as the lookup key in the Puck catch-all route.
   * Must be unique across all pages.
   */
  path: string;

  /**
   * Declarative layout data as produced and consumed by Puck.
   * Stored as a plain Mixed object to allow Puck's internal structure to evolve
   * without requiring schema migrations.
   */
  puckData: PuckData;

  /** Human-readable page title shown in browser tabs and admin lists. */
  title: string;

  /**
   * Controls whether the page is publicly accessible.
   * Unpublished pages are only visible to Admins and editors.
   */
  published: boolean;

  /**
   * Obsidian-style category tags for filtering and Page Manager display.
   * Synced from `root.props.pageSettings.categories` on Puck publish.
   */
  categories: string[];

  /** Short summary for news cards, SEO, and Page Manager. */
  description: string;

  /** Hero/cover image URL (`/uploads/page-covers/…`) — distinct from page background. */
  coverImage: string;

  /**
   * Additional publication gallery images (`image2`–`image4` variables).
   * Primary cover remains {@link coverImage} (`image1`).
   */
  galleryImages: string[];

  /** Original author — set on first save; only admins may reassign. */
  authorUserId?: Types.ObjectId;

  /**
   * Scheduled go-live timestamp. When set in the future the page stays hidden
   * until {@link SchedulerDomain} executes a `publish_page` event.
   */
  publishAt: Date | null;

  /** When true, the public comment section is enabled for this page. */
  commentsEnabled: boolean;

  /** Monotonic public view counter (anonymous + authenticated). */
  viewCount: number;

  /** Denormalized like count synced from {@link PageLike}. */
  likeCount: number;

  /** Users granted edit access to this specific page by an administrator. */
  delegatedEditorUserIds: Types.ObjectId[];

  /**
   * Active publisher invite link metadata.
   * Plain tokens are never stored — only a SHA-256 hash.
   */
  publisherInvite?: {
    tokenHash: string;
    expiresAt: Date;
    createdBy: Types.ObjectId;
  } | null;

  /** Timestamp when the document was first created. */
  createdAt: Date;

  /** Timestamp of the last document mutation. */
  updatedAt: Date;
}

// ── Schema Definition ─────────────────────────────────────────────────────────

/**
 * Mongoose schema for the Page model.
 *
 * The `path` field carries a unique index so duplicate routes are rejected
 * at the database level rather than silently creating ambiguous documents.
 */
const PageSchema = new Schema<IPage>(
  {
    path: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    puckData: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({ content: [], zones: {} }),
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Page",
    },
    published: {
      type: Boolean,
      default: false,
    },
    categories: {
      type: [String],
      default: () => [],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    coverImage: {
      type: String,
      default: "",
      trim: true,
    },
    galleryImages: {
      type: [String],
      default: () => [],
    },
    authorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    publishAt: {
      type: Date,
      default: null,
      index: true,
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    delegatedEditorUserIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: () => [],
    },
    publisherInvite: {
      type: {
        tokenHash: { type: String, required: true, trim: true },
        expiresAt: { type: Date, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "pages",
  },
);

// ── Model Registration ─────────────────────────────────────────────────────────

/**
 * The Nexus Page model.
 *
 * Always imported via this module — never construct a new `mongoose.model`
 * call elsewhere to avoid the "Cannot overwrite model" error during hot-reload.
 */
const Page: Model<IPage> =
  mongoose.models.Page ?? mongoose.model<IPage>("Page", PageSchema);

export default Page;
