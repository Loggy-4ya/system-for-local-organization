/**
 * @fileoverview Singleton Global Layout configuration stored in MongoDB.
 *
 * @module shared/models/GlobalLayout
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import {
  ALLOWED_LUCIDE_ICONS,
  GLOBAL_LAYOUT_ID,
  type GlobalLayoutConfig,
} from "../constants/globalLayout";

export { GLOBAL_LAYOUT_ID };

/** Persisted Global Layout configuration. */
export interface IGlobalLayout extends Omit<Document, "_id">, GlobalLayoutConfig {
  /** Singleton key — always {@link GLOBAL_LAYOUT_ID}. */
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

const HeaderNavItemSchema = new Schema({
  id: { type: String, required: true },
  href: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, enum: ALLOWED_LUCIDE_ICONS },
  variant: { type: String, enum: ["link", "button"], default: "link" },
  adminOnly: { type: Boolean, default: false },
});

const HeaderCategorySchema = new Schema({
  id: { type: String, required: true },
  label: { type: String },
  icon: { type: String, enum: ALLOWED_LUCIDE_ICONS },
  variant: { type: String, enum: ["link", "button"], default: "link" },
  adminOnly: { type: Boolean, default: false },
  align: { type: String, enum: ["start", "center", "end"] },
  items: { type: [HeaderNavItemSchema], default: [] },
});

const HeaderConfigSchema = new Schema({
  layout: {
    gap: { type: String, enum: ["sm", "md", "lg", "xl", "2xl"], default: "md" },
    align: { type: String, enum: ["start", "center", "end"], default: "start" },
  },
  categories: { type: [HeaderCategorySchema], default: [] },
  userMenu: { type: [HeaderNavItemSchema], default: [] },
});

const FooterLinkSchema = new Schema({
  id: { type: String, required: true },
  href: { type: String, required: true },
  label: { type: String, required: true },
  external: { type: Boolean, default: false },
});

const FooterSocialLinkSchema = new Schema({
  id: { type: String, required: true },
  href: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, enum: ALLOWED_LUCIDE_ICONS, required: true },
});

const FooterSectionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String },
  links: { type: [FooterLinkSchema], default: [] },
});

const FooterConfigSchema = new Schema({
  layout: {
    columns: { type: Number, enum: [2, 3, 4], default: 2 },
  },
  sections: { type: [FooterSectionSchema], default: [] },
  socialLinks: { type: [FooterSocialLinkSchema], default: [] },
  mention: { type: String },
  copyright: { type: String },
});

const GlobalLayoutSchema = new Schema<IGlobalLayout>(
  {
    _id: {
      type: String,
      default: GLOBAL_LAYOUT_ID,
    },
    header: {
      type: HeaderConfigSchema,
      required: true,
      default: () => ({}),
    },
    footer: {
      type: FooterConfigSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    /** MongoDB collection for the singleton global layout document. */
    collection: "global_layout",
  }
);

const GlobalLayout: Model<IGlobalLayout> =
  mongoose.models.GlobalLayout ??
  mongoose.model<IGlobalLayout>("GlobalLayout", GlobalLayoutSchema);

export default GlobalLayout;
