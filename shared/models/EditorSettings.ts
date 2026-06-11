/**
 * @fileoverview Singleton Puck editor settings stored in MongoDB.
 *
 * @module shared/models/EditorSettings
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  DEFAULT_ISLAND_COMPONENTS,
  EDITOR_SETTINGS_ID,
} from "../constants/editorSettings";

export { DEFAULT_ISLAND_COMPONENTS, EDITOR_SETTINGS_ID };

/** Persisted Puck editor configuration. */
export interface IEditorSettings extends Omit<Document, "_id"> {
  /** Singleton key — always {@link EDITOR_SETTINGS_ID}. */
  _id: string;
  /** Puck component type keys that auto-enable island on canvas insert. */
  islandDefaultComponents: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EditorSettingsSchema = new Schema<IEditorSettings>(
  {
    _id: {
      type: String,
      default: EDITOR_SETTINGS_ID,
    },
    islandDefaultComponents: {
      type: [String],
      default: () => [...DEFAULT_ISLAND_COMPONENTS],
    },
  },
  {
    timestamps: true,
    collection: "editor_settings",
  },
);

const EditorSettings: Model<IEditorSettings> =
  mongoose.models.EditorSettings ??
  mongoose.model<IEditorSettings>("EditorSettings", EditorSettingsSchema);

export default EditorSettings;
