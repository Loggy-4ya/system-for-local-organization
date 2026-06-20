/**
 * @fileoverview Consolidated Global Layout domain engine for Project Nexus.
 *
 * Handles loading, seeding, validation, and updating of the site-wide
 * header and footer configuration.
 *
 * @module shared/domains/GlobalLayoutDomain
 */

import connectDB from "@shared/lib/db";
import GlobalLayout, { GLOBAL_LAYOUT_ID, type IGlobalLayout } from "@shared/models/GlobalLayout";
import {
  ALLOWED_LUCIDE_ICONS,
  DEFAULT_GLOBAL_LAYOUT,
  DEFAULT_HEADER_USER_MENU,
  type GlobalLayoutConfig,
  type HeaderConfig,
  type FooterConfig,
  type HeaderCategory,
  type HeaderNavItem,
  type FooterSection,
  type FooterLinkColumnCount,
  type FooterLink,
  type FooterSocialLink,
  type AllowedLucideIcon,
} from "../constants/globalLayout";

/** Legacy MongoDB collection name (pre rename to `global_layout`). */
const LEGACY_GLOBAL_LAYOUT_COLLECTION = "site_chrome";

/**
 * Global Layout Domain Engine.
 *
 * Consolidates all database operations, defaults seeding, and structural
 * validation for site-wide layout (header and footer).
 */
export class GlobalLayoutDomain {
  /**
   * Copy the singleton document from the legacy `site_chrome` collection when present.
   *
   * @returns True when a legacy row was copied into `global_layout`.
   */
  private static async migrateLegacyCollection(): Promise<boolean> {
    const legacy = await GlobalLayout.db
      .collection<{ _id: string; header?: HeaderConfig; footer?: FooterConfig }>(
        LEGACY_GLOBAL_LAYOUT_COLLECTION,
      )
      .findOne({ _id: GLOBAL_LAYOUT_ID });

    if (!legacy?.header || !legacy.footer) {
      return false;
    }

    await GlobalLayout.create({
      _id: GLOBAL_LAYOUT_ID,
      header: legacy.header,
      footer: legacy.footer,
    });

    return true;
  }

  /**
   * Load the singleton global layout configuration, or seed it if missing.
   *
   * Migrates from legacy collection `site_chrome` on first access when the new
   * `global_layout` collection has no document yet.
   *
   * @returns Normalized global layout configuration document.
   */
  public static async loadOrSeed(): Promise<IGlobalLayout> {
    await connectDB();

    let doc = await GlobalLayout.findById(GLOBAL_LAYOUT_ID);

    if (!doc && (await this.migrateLegacyCollection())) {
      doc = await GlobalLayout.findById(GLOBAL_LAYOUT_ID);
    }

    if (!doc) {
      doc = await GlobalLayout.findOneAndUpdate(
        { _id: GLOBAL_LAYOUT_ID },
        {
          $setOnInsert: {
            header: DEFAULT_GLOBAL_LAYOUT.header,
            footer: DEFAULT_GLOBAL_LAYOUT.footer,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }

    if (!doc) {
      const fallback = await GlobalLayout.findById(GLOBAL_LAYOUT_ID);
      if (!fallback) {
        throw new Error("Failed to load or seed global layout settings.");
      }
      return fallback;
    }

    return doc;
  }

  /**
   * Update the global layout configuration after validating the payload.
   *
   * @param update - Partial global layout configuration.
   * @returns Updated global layout configuration.
   * @throws Error with validation details if structural checks fail.
   */
  public static async update(update: Partial<GlobalLayoutConfig>): Promise<IGlobalLayout> {
    await connectDB();

    const current = await this.loadOrSeed();

    if (update.header) {
      this.validateHeader(update.header);
      current.header = update.header;
    }

    if (update.footer) {
      this.validateFooter(update.footer);
      current.footer = update.footer;
    }

    await current.save();
    return current;
  }

  /**
   * Validate header configuration.
   *
   * @param header - Header configuration to validate.
   * @throws Error if validation fails.
   */
  public static validateHeader(header: HeaderConfig): void {
    if (!header || typeof header !== "object") {
      throw new Error("Header configuration must be an object.");
    }

    if (!header.layout || typeof header.layout !== "object") {
      throw new Error("Header layout must be an object.");
    }

    if (!["sm", "md", "lg", "xl", "2xl"].includes(header.layout.gap)) {
      throw new Error("Header layout gap must be 'sm', 'md', 'lg', 'xl', or '2xl'.");
    }

    if (!["start", "center", "end"].includes(header.layout.align)) {
      throw new Error("Header layout align must be 'start', 'center', or 'end'.");
    }

    if (!Array.isArray(header.categories)) {
      throw new Error("Header categories must be an array.");
    }

    for (const category of header.categories) {
      this.validateCategory(category);
    }

    if (header.userMenu !== undefined && !Array.isArray(header.userMenu)) {
      throw new Error("Header user menu must be an array.");
    }

    for (const item of header.userMenu ?? []) {
      this.validateNavItem(item, "userMenu");
    }
  }

  /**
   * Validate an individual header category.
   *
   * @param category - Category to validate.
   * @throws Error if validation fails.
   */
  private static validateCategory(category: HeaderCategory): void {
    if (!category || typeof category !== "object") {
      throw new Error("Header category must be an object.");
    }

    if (typeof category.id !== "string" || !category.id.trim()) {
      throw new Error("Header category must have a non-empty string ID.");
    }

    if (category.label !== undefined && typeof category.label !== "string") {
      throw new Error("Header category label must be a string.");
    }

    if (category.icon !== undefined) {
      if (
        typeof category.icon !== "string" ||
        !ALLOWED_LUCIDE_ICONS.includes(category.icon as AllowedLucideIcon)
      ) {
        throw new Error(
          `Header category '${category.id}' has an invalid or unsupported icon: '${category.icon}'.`,
        );
      }
    }

    if (category.variant !== undefined && !["link", "button"].includes(category.variant)) {
      throw new Error(`Header category '${category.id}' variant must be 'link' or 'button'.`);
    }

    if (category.adminOnly !== undefined && typeof category.adminOnly !== "boolean") {
      throw new Error(`Header category '${category.id}' adminOnly must be a boolean.`);
    }

    if (
      category.align !== undefined &&
      !["start", "center", "end"].includes(category.align)
    ) {
      throw new Error(`Header category '${category.id}' align must be 'start', 'center', or 'end'.`);
    }

    if (!Array.isArray(category.items)) {
      throw new Error(`Header category '${category.id}' items must be an array.`);
    }

    for (const item of category.items) {
      this.validateNavItem(item, category.id);
    }
  }

  /**
   * Validate an individual header navigation item.
   *
   * @param item - Navigation item to validate.
   * @param categoryId - Parent category ID for context.
   * @throws Error if validation fails.
   */
  private static validateNavItem(item: HeaderNavItem, categoryId: string): void {
    if (!item || typeof item !== "object") {
      throw new Error(`Navigation item in category '${categoryId}' must be an object.`);
    }

    if (typeof item.id !== "string" || !item.id.trim()) {
      throw new Error(`Navigation item in category '${categoryId}' must have a non-empty string ID.`);
    }

    if (typeof item.href !== "string" || !item.href.trim()) {
      throw new Error(`Navigation item '${item.id}' in category '${categoryId}' must have a non-empty string href.`);
    }

    if (typeof item.label !== "string" || !item.label.trim()) {
      throw new Error(`Navigation item '${item.id}' in category '${categoryId}' must have a non-empty string label.`);
    }

    if (item.icon !== undefined) {
      if (typeof item.icon !== "string" || !ALLOWED_LUCIDE_ICONS.includes(item.icon as AllowedLucideIcon)) {
        throw new Error(`Navigation item '${item.id}' has an invalid or unsupported icon: '${item.icon}'.`);
      }
    }

    if (item.variant !== undefined && !["link", "button"].includes(item.variant)) {
      throw new Error(`Navigation item '${item.id}' variant must be 'link' or 'button'.`);
    }

    if (item.adminOnly !== undefined && typeof item.adminOnly !== "boolean") {
      throw new Error(`Navigation item '${item.id}' adminOnly must be a boolean.`);
    }
  }

  /**
   * Validate footer configuration.
   *
   * @param footer - Footer configuration to validate.
   * @throws Error if validation fails.
   */
  public static validateFooter(footer: FooterConfig): void {
    if (!footer || typeof footer !== "object") {
      throw new Error("Footer configuration must be an object.");
    }

    if (!Array.isArray(footer.sections)) {
      throw new Error("Footer sections must be an array.");
    }

    for (const section of footer.sections) {
      this.validateFooterSection(section);
    }

    if (!Array.isArray(footer.socialLinks)) {
      throw new Error("Footer social links must be an array.");
    }

    for (const social of footer.socialLinks) {
      this.validateFooterSocialLink(social);
    }

    if (footer.layout !== undefined) {
      if (!footer.layout || typeof footer.layout !== "object") {
        throw new Error("Footer layout must be an object.");
      }

      if (![2, 3, 4].includes(footer.layout.columns)) {
        throw new Error("Footer layout columns must be 2, 3, or 4.");
      }
    }

    if (footer.mention !== undefined && typeof footer.mention !== "string") {
      throw new Error("Footer mention must be a string.");
    }

    if (footer.copyright !== undefined && typeof footer.copyright !== "string") {
      throw new Error("Footer copyright must be a string.");
    }
  }

  /**
   * Validate an individual footer section.
   *
   * @param section - Section to validate.
   * @throws Error if validation fails.
   */
  private static validateFooterSection(section: FooterSection): void {
    if (!section || typeof section !== "object") {
      throw new Error("Footer section must be an object.");
    }

    if (typeof section.id !== "string" || !section.id.trim()) {
      throw new Error("Footer section must have a non-empty string ID.");
    }

    if (section.title !== undefined && typeof section.title !== "string") {
      throw new Error("Footer section title must be a string.");
    }

    if (!Array.isArray(section.links)) {
      throw new Error(`Footer section '${section.id}' links must be an array.`);
    }

    for (const link of section.links) {
      this.validateFooterLink(link, section.id);
    }
  }

  /**
   * Validate an individual footer link.
   *
   * @param link - Link to validate.
   * @param sectionId - Parent section ID for context.
   * @throws Error if validation fails.
   */
  private static validateFooterLink(link: FooterLink, sectionId: string): void {
    if (!link || typeof link !== "object") {
      throw new Error(`Footer link in section '${sectionId}' must be an object.`);
    }

    if (typeof link.id !== "string" || !link.id.trim()) {
      throw new Error(`Footer link in section '${sectionId}' must have a non-empty string ID.`);
    }

    if (typeof link.href !== "string" || !link.href.trim()) {
      throw new Error(`Footer link '${link.id}' in section '${sectionId}' must have a non-empty string href.`);
    }

    if (typeof link.label !== "string" || !link.label.trim()) {
      throw new Error(`Footer link '${link.id}' in section '${sectionId}' must have a non-empty string label.`);
    }

    if (link.external !== undefined && typeof link.external !== "boolean") {
      throw new Error(`Footer link '${link.id}' external flag must be a boolean.`);
    }
  }

  /**
   * Validate an individual footer social link.
   *
   * @param social - Social link to validate.
   * @throws Error if validation fails.
   */
  private static validateFooterSocialLink(social: FooterSocialLink): void {
    if (!social || typeof social !== "object") {
      throw new Error("Footer social link must be an object.");
    }

    if (typeof social.id !== "string" || !social.id.trim()) {
      throw new Error("Footer social link must have a non-empty string ID.");
    }

    if (typeof social.href !== "string" || !social.href.trim()) {
      throw new Error(`Footer social link '${social.id}' must have a non-empty string href.`);
    }

    if (typeof social.label !== "string" || !social.label.trim()) {
      throw new Error(`Footer social link '${social.id}' must have a non-empty string label.`);
    }

    if (typeof social.icon !== "string" || !ALLOWED_LUCIDE_ICONS.includes(social.icon as AllowedLucideIcon)) {
      throw new Error(`Footer social link '${social.id}' has an invalid or unsupported icon: '${social.icon}'.`);
    }
  }

  /**
   * Strip Mongoose-specific metadata and return a clean JSON config.
   *
   * @param doc - Mongoose document or raw object.
   * @returns Clean GlobalLayoutConfig payload.
   */
  public static toPublicConfig(doc: IGlobalLayout): GlobalLayoutConfig {
    return {
      header: {
        layout: {
          gap: doc.header?.layout?.gap ?? "md",
          align: doc.header?.layout?.align ?? "start",
        },
        categories: (doc.header?.categories ?? []).map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          variant: cat.variant ?? "link",
          adminOnly: cat.adminOnly ?? false,
          align: cat.align,
          items: (cat.items ?? []).map((item) => ({
            id: item.id,
            href: item.href,
            label: item.label,
            icon: item.icon,
            variant: item.variant ?? "link",
            adminOnly: item.adminOnly ?? false,
          })),
        })),
        userMenu: (doc.header?.userMenu?.length
          ? doc.header.userMenu
          : DEFAULT_HEADER_USER_MENU
        ).map((item) => ({
          id: item.id,
          href: item.href,
          label: item.label,
          icon: item.icon,
          variant: item.variant ?? "link",
          adminOnly: item.adminOnly ?? false,
        })),
      },
      footer: {
        layout: {
          columns: ([2, 3, 4].includes(doc.footer?.layout?.columns as number)
            ? doc.footer!.layout!.columns
            : 2) as FooterLinkColumnCount,
        },
        sections: (doc.footer?.sections ?? []).map((sec) => ({
          id: sec.id,
          title: sec.title,
          links: (sec.links ?? []).map((link) => ({
            id: link.id,
            href: link.href,
            label: link.label,
            external: link.external ?? false,
          })),
        })),
        socialLinks: (doc.footer?.socialLinks ?? []).map((social) => ({
          id: social.id,
          href: social.href,
          label: social.label,
          icon: social.icon,
        })),
        mention: doc.footer?.mention,
        copyright: doc.footer?.copyright,
      },
    };
  }
}
