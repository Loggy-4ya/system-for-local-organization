/**
 * @fileoverview Singleton settings for the admin page categories hub / news catalog.
 *
 * @module shared/models/PageCategoriesSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  PAGE_CATEGORIES_SETTINGS_ID,
  type PageCategoryHubSection,
} from "../constants/pageCategoriesHub";

export { PAGE_CATEGORIES_SETTINGS_ID };

/** Persisted page category hub configuration. */
export interface IPageCategoriesSettings extends Omit<Document, "_id"> {
  /** Singleton key — always {@link PAGE_CATEGORIES_SETTINGS_ID}. */
  _id: string;
  /** Admin-configured hub sections keyed by Puck path domains. */
  sections: PageCategoryHubSection[];
  createdAt: Date;
  updatedAt: Date;
}

const PageCategoryHubSectionSchema = new Schema<PageCategoryHubSection>(
  {
    id: { type: String, required: true, trim: true },
    domain: { type: String, trim: true, default: "" },
    /** @deprecated Legacy Obsidian tag key — read for migration only. */
    categoryLabel: { type: String, trim: true },
    pagePaths: { type: [String], default: () => [] },
    cardLayout: { type: String, default: "uniform-grid", trim: true },
    imagesPerCard: { type: Number, default: 1, min: 1, max: 4 },
  },
  { _id: false },
);

const PageCategoriesSettingsSchema = new Schema<IPageCategoriesSettings>(
  {
    _id: {
      type: String,
      default: PAGE_CATEGORIES_SETTINGS_ID,
    },
    sections: {
      type: [PageCategoryHubSectionSchema],
      default: () => [],
    },
  },
  {
    timestamps: true,
    collection: "page_categories_settings",
  },
);

const PageCategoriesSettings: Model<IPageCategoriesSettings> =
  mongoose.models.PageCategoriesSettings ??
  mongoose.model<IPageCategoriesSettings>(
    "PageCategoriesSettings",
    PageCategoriesSettingsSchema,
  );

export default PageCategoriesSettings;
