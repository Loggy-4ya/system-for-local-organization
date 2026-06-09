/**
 * @fileoverview Puck.js Page Mongoose schema for Project Nexus.
 *
 * Each document stores the declarative layout JSON produced by Puck's visual
 * editor for a single URL path. The `path` field is the unique lookup key used
 * by the catch-all Next.js route to hydrate pages on demand.
 *
 * @module shared/models/Page
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ── Document Interface ────────────────────────────────────────────────────────

/**
 * The minimal Puck data envelope required for serialisation.
 * Full Puck typings are defined by `@measured/puck`.
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
  },
  {
    timestamps: true,
    collection: "pages",
  }
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
