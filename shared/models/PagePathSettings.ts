/**
 * @fileoverview Singleton settings for Puck page path domain picker visibility.
 *
 * @module shared/models/PagePathSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import { PAGE_PATH_SETTINGS_ID } from "@shared/constants/pagePathSettings";

export { PAGE_PATH_SETTINGS_ID };

/** Persisted page path settings singleton document. */
export interface IPagePathSettings extends Omit<Document, "_id"> {
  /** Singleton key — always {@link PAGE_PATH_SETTINGS_ID}. */
  _id: string;
  /** Domain segments hidden from the page editor picker (pages keep working). */
  hiddenDomains: string[];
  /** Institution-added domain segments shown in the picker before any page uses them. */
  customDomains: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PagePathSettingsSchema = new Schema<IPagePathSettings>(
  {
    _id: {
      type: String,
      default: PAGE_PATH_SETTINGS_ID,
    },
    hiddenDomains: {
      type: [String],
      default: () => [],
    },
    customDomains: {
      type: [String],
      default: () => [],
    },
  },
  {
    timestamps: true,
    collection: "page_path_settings",
  },
);

const PagePathSettings: Model<IPagePathSettings> =
  mongoose.models.PagePathSettings ??
  mongoose.model<IPagePathSettings>("PagePathSettings", PagePathSettingsSchema);

export default PagePathSettings;
