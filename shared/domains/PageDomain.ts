/**
 * @fileoverview Consolidated Page domain engine for Project Nexus.
 *
 * Single entry point for Puck-managed page persistence mutations shared across
 * API routes and workers.
 *
 * @module shared/domains/PageDomain
 *
 * Tests: `npm run test:page-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  canUserCreatePages,
  canUserEditPage,
  type PageEditActorSlice,
  type PageOwnershipSlice,
} from "@shared/lib/pageEditAccessLogic";
import {
  isPagePubliclyVisible,
  normalizePublishAt,
  publishPageIdempotencyKey,
  resolvePublicationStateOnSave,
} from "@shared/lib/pagePublicationLogic";
import {
  filterPageCategorySuggestions,
  normalizePageCategoryList,
} from "@shared/lib/pageCategoryLogic";
import {
  normalizeNewsCatalogImagesPerCard,
  normalizeNewsCatalogPageCardVariant,
  normalizePageGalleryImages,
} from "@shared/lib/pageCategoriesHubLogic";
import type {
  NewsCatalogImagesPerCard,
  NewsCatalogPageCardVariant,
} from "@shared/constants/pageCategoriesHub";
import {
  type PageAccessEditorCandidate,
  type PageAccessEditorEntry,
  canManagePageAccess,
  normalizeDelegatedEditorsForStorage,
  resolvePageAccessDisplayName,
} from "@shared/lib/pageAccessLogic";
import {
  appendCustomPagePathDomain,
  appendHiddenPagePathDomain,
  applyPagePathDomainVisibility,
  normalizeCustomPagePathDomains,
  normalizeHiddenPagePathDomains,
  validatePagePathDomainSegment,
} from "@shared/lib/pagePathDomainListLogic";
import {
  computePagePublisherInviteExpiry,
  generatePagePublisherInviteToken,
  hashPagePublisherInviteToken,
  hasPagePublisherAccess,
  validatePagePublisherInviteToken,
  type PagePublisherInviteRecord,
} from "@shared/lib/pagePublisherInviteLogic";
import { SCHEDULED_EVENT_TYPES } from "@shared/constants/scheduledEventTypes";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import type { PermissionKey } from "@shared/constants/accessControl";
import Page, { type IPage, type PuckData } from "@shared/models/Page";
import PageLike from "@shared/models/PageLike";
import PageDislike from "@shared/models/PageDislike";
import PagePathSettings, {
  PAGE_PATH_SETTINGS_ID,
  type IPagePathSettings,
} from "@shared/models/PagePathSettings";
import User from "@shared/models/User";
import {
  computePagePathForUncategorizedMove,
  countPagePathSegments,
  discoverPagePathDomainsFromPaths,
  filterPagePathCatalog,
  type PagePathCatalogEntry,
  mergePagePathDomains,
  normalizePagePath,
  normalizePageDomainSegment,
  toPagePathCatalogEntries,
} from "@shared/lib/pagePathLogic";
import { shouldIncrementPageView } from "@shared/lib/pageViewDedupeLogic";
import {
  buildPagePublishActionHref,
  buildPagePublishNotificationCopy,
  resolvePageNotifyOnPublish,
  resolvePageNotifyTelegramOnPublish,
  resolvePageNotifyWebOnPublish,
  shouldDispatchPageGoLiveNotifications,
  shouldReceivePageGoLiveNotification,
  type PageGoLiveNotificationSnapshot,
} from "@shared/lib/pagePublishNotificationLogic";
import {
  buildPageMentionNotificationCopy,
  buildPageMentionTelegramMessage,
  collectUserMentionIdsFromPuckData,
  resolvePageMentionNotificationRecipients,
  shouldDispatchPageMentionNotifications,
} from "@shared/lib/pageMentionNotificationLogic";
import { formatTelegramPagePublishedMessage } from "@shared/lib/telegramPagePublishFormat";
import { buildInboxDeliveryKey } from "@shared/lib/notificationInboxLogic";
import { userAcceptsNotificationChannel } from "@shared/lib/userNotificationSettingsLogic";
import type { NotificationInboxChannel } from "@shared/constants/notificationInbox";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { TelegramBotDomain } from "@shared/domains/TelegramBotDomain";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { Types } from "mongoose";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";

/** Publication metadata extracted from Puck root props on save. */
export interface PagePublicationInput {
  description?: string;
  coverImage?: string;
  galleryImages?: string[];
  publishAt?: Date | string | null;
  commentsEnabled?: boolean;
  notifyOnPublish?: boolean;
  notifyWebOnPublish?: boolean;
  notifyTelegramOnPublish?: boolean;
  catalogImagesPerCard?: NewsCatalogImagesPerCard;
  catalogCardVariant?: NewsCatalogPageCardVariant;
}

/** Serializable page metadata returned to the editor and viewer. */
export interface PageMetadataDto {
  path: string;
  title: string;
  published: boolean;
  categories: string[];
  description: string;
  coverImage: string;
  galleryImages: string[];
  catalogImagesPerCard: NewsCatalogImagesPerCard;
  catalogCardVariant: NewsCatalogPageCardVariant;
  authorUserId: string | null;
  authorDisplayName: string | null;
  publishAt: string | null;
  commentsEnabled: boolean;
  notifyOnPublish: boolean;
  notifyWebOnPublish: boolean;
  notifyTelegramOnPublish: boolean;
  /** Effective institutional Telegram template for page-publish preview (edit mode). */
  telegramPagePublishedTemplate?: string;
  /** When true, editor may open admin Telegram template settings. */
  canManageTelegramTemplates?: boolean;
  /** Top-level comment count when hydrated server-side for the launcher badge. */
  commentCount: number | null;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  updatedAt: string;
  delegatedEditorUserIds: string[];
  /** Hydrated grant rows for the page access picker. */
  delegatedEditors: PageAccessEditorEntry[];
  /** True when the signed-in editor may manage delegated access grants. */
  canManagePageAccess: boolean;
  /** True when the editor may add or hide institutional path-domain labels. */
  canManagePagePathDomains: boolean;
  /** True when this editor route maps to a MongoDB Page document. */
  isPersisted: boolean;
}

/**
 * Domain-level error with an HTTP status hint for API routes.
 */
export class PageDomainError extends Error {
  /** Suggested HTTP status for API responses. */
  readonly httpStatus: number;

  /**
   * @param message - User-facing error message.
   * @param httpStatus - Suggested HTTP status code.
   */
  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "PageDomainError";
    this.httpStatus = httpStatus;
  }
}

/**
 * Page Domain Engine.
 *
 * Owns MongoDB mutations for Puck-managed CMS pages.
 */
export class PageDomain {
  /**
   * Validate that a page path may be deleted.
   *
   * @param path - Absolute MongoDB page path key.
   * @returns Trimmed path when deletable.
   * @throws {@link PageDomainError} When the path is missing, homepage, or malformed.
   */
  public static assertDeletablePath(path: string): string {
    const trimmed = path?.trim();
    if (!trimmed) {
      throw new PageDomainError("Page path is required.", 400);
    }
    if (trimmed === "/") {
      throw new PageDomainError(
        "The homepage cannot be deleted. Edit src/app/page.tsx in code.",
        400,
      );
    }
    if (!trimmed.startsWith("/")) {
      throw new PageDomainError("Path must start with a slash (/).", 400);
    }
    return trimmed;
  }

  /**
   * Delete a Puck-managed page document by path.
   *
   * @param path - Absolute MongoDB page path key.
   * @throws {@link PageDomainError} When the path is invalid or no document exists.
   */
  public static async deleteByPath(path: string): Promise<void> {
    const normalizedPath = PageDomain.assertDeletablePath(path);

    await connectDB();
    const result = await Page.deleteOne({ path: normalizedPath });

    if (result.deletedCount === 0) {
      throw new PageDomainError(`No page found at "${normalizedPath}".`, 404);
    }

    await SchedulerDomain.cancelEvent(publishPageIdempotencyKey(normalizedPath));
    await PageLike.deleteMany({ pagePath: normalizedPath });
  }

  /**
   * List distinct category labels used across all Puck pages for editor autocomplete.
   *
   * @param query - Optional case-insensitive substring filter.
   * @returns Sorted unique labels (display casing from first MongoDB occurrence).
   */
  public static async listDistinctCategories(query = ""): Promise<string[]> {
    await connectDB();

    const pipeline: Record<string, unknown>[] = [
      { $unwind: "$categories" },
      { $match: { categories: { $type: "string", $ne: "" } } },
      {
        $group: {
          _id: { $toLower: "$categories" },
          label: { $first: "$categories" },
        },
      },
      { $sort: { label: 1 } },
    ];

    const rows = await Page.aggregate<{ label: string }>(pipeline);
    const labels = rows.map((row) => row.label).filter(Boolean);
    return filterPageCategorySuggestions(query, labels);
  }

  /**
   * List Puck page paths for slug validation and link pickers.
   *
   * @param query - Optional case-insensitive filter on path or title.
   * @returns Sorted catalog entries with badge labels and hrefs.
   */
  public static async listPagePathCatalog(query = ""): Promise<PagePathCatalogEntry[]> {
    await connectDB();
    const docs = await Page.find({}, { path: 1, title: 1 }).sort({ path: 1 }).lean();
    const catalog = toPagePathCatalogEntries(docs);
    return filterPagePathCatalog(query, catalog);
  }

  /**
   * Return reserved absolute paths for slug collision checks.
   *
   * @returns Sorted page paths excluding homepage.
   */
  public static async listReservedPagePaths(): Promise<string[]> {
    await connectDB();
    const docs = await Page.find({}, { path: 1 }).lean();
    return docs
      .map((doc) => doc.path)
      .filter((path) => Boolean(path) && path !== "/")
      .sort();
  }

  /**
   * List domain segments for `/domain/page_slug` addressing in the editor.
   *
   * Merges {@link DEFAULT_PAGE_PATH_DOMAINS} with domains inferred from nested
   * page paths (`/news/fair` → `news`), custom labels, then removes institution-hidden
   * domains unless they are explicitly included. Flat single-segment slugs such as
   * `/the-page` do not register as domains.
   *
   * @param options - Optional domains that must remain visible for the active page.
   * @returns Sorted unique visible domain labels without leading slashes.
   */
  public static async listPagePathDomains(options?: {
    alwaysInclude?: readonly string[];
  }): Promise<string[]> {
    await connectDB();
    const docs = await Page.find({}, { path: 1 }).lean();
    const discovered = discoverPagePathDomainsFromPaths(
      docs.map((doc) => doc.path).filter(Boolean),
    );

    const settings = await PageDomain.loadPagePathSettings();
    const merged = mergePagePathDomains([
      ...discovered,
      ...normalizeCustomPagePathDomains(settings.customDomains ?? []),
    ]);
    return applyPagePathDomainVisibility(
      merged,
      settings.hiddenDomains,
      options?.alwaysInclude ?? [],
    );
  }

  /**
   * List every merged domain segment for admin catalog management (includes hidden labels).
   *
   * @returns Sorted unique domain labels without leading slashes.
   */
  public static async listAllMergedPagePathDomains(): Promise<string[]> {
    await connectDB();
    const docs = await Page.find({}, { path: 1 }).lean();
    const discovered = discoverPagePathDomainsFromPaths(
      docs.map((doc) => doc.path).filter(Boolean),
    );
    const settings = await PageDomain.loadPagePathSettings();
    return mergePagePathDomains([
      ...discovered,
      ...normalizeCustomPagePathDomains(settings.customDomains ?? []),
    ]);
  }

  /**
   * Load or seed the page path settings singleton.
   *
   * @returns Page path settings document.
   */
  public static async loadPagePathSettings(): Promise<IPagePathSettings> {
    await connectDB();
    let doc = await PagePathSettings.findById(PAGE_PATH_SETTINGS_ID);
    if (!doc) {
      doc = await PagePathSettings.create({
        _id: PAGE_PATH_SETTINGS_ID,
        hiddenDomains: [],
        customDomains: [],
      });
    }
    return doc;
  }

  /**
   * Count Puck pages stored under a domain segment.
   *
   * @param domain - Domain segment such as `news`.
   * @returns Number of pages at `/domain` or `/domain/*`.
   */
  public static async countPagesUnderDomain(domain: string): Promise<number> {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) return 0;

    await connectDB();
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Page.countDocuments({
      path: { $regex: new RegExp(`^/${escaped}(/|$)`) },
    });
  }

  /**
   * List every persisted page path under a domain segment.
   *
   * @param domain - Domain segment such as `news`.
   * @returns Absolute paths at `/domain` or `/domain/*`, deepest paths first.
   */
  public static async listPagePathsUnderDomain(domain: string): Promise<string[]> {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) return [];

    await connectDB();
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docs = await Page.find(
      { path: { $regex: new RegExp(`^/${escaped}(/|$)`) } },
      { path: 1 },
    ).lean();

    return docs
      .map((row) => normalizePagePath(String(row.path ?? "")))
      .filter(Boolean)
      .sort((left, right) => countPagePathSegments(right) - countPagePathSegments(left));
  }

  /**
   * Move every page under a domain to uncategorized flat paths, then hide the domain label.
   *
   * Used when an administrator removes a catalog domain on `/pages/edit`.
   *
   * @param domain - Domain segment to remove.
   * @param actorUserId - Authenticated user performing the change.
   * @returns Updated visible domains and the rename map applied to child pages.
   * @throws {@link PageDomainError} When the domain is invalid or a destination path collides.
   */
  public static async removeCatalogPagePathDomain(
    domain: string,
    actorUserId: string,
  ): Promise<{
    domains: string[];
    movedPages: Array<{ fromPath: string; toPath: string }>;
  }> {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) {
      throw new PageDomainError("Enter a valid domain label.", 400);
    }

    const canCreate = await PageDomain.canUserCreatePage(actorUserId);
    if (!canCreate) {
      throw new PageDomainError("You do not have permission to manage page domains.", 403);
    }

    const knownDomains = await PageDomain.listAllMergedPagePathDomains();
    const pagePaths = await PageDomain.listPagePathsUnderDomain(normalized);
    const movedPages: Array<{ fromPath: string; toPath: string }> = [];

    for (const fromPath of pagePaths) {
      const toPath = computePagePathForUncategorizedMove(fromPath, normalized, knownDomains);
      if (!toPath) continue;

      if (fromPath === toPath) {
        movedPages.push({ fromPath, toPath });
        continue;
      }

      const renamed = await PageDomain.renamePagePath({ fromPath, toPath });
      movedPages.push({ fromPath, toPath: renamed });
    }

    const domains = await PageDomain.hidePagePathDomain(normalized, actorUserId);
    return { domains, movedPages };
  }

  /**
   * Hide a domain segment from the page editor picker for all editors.
   *
   * Existing pages under the domain keep their URLs; the domain may still appear
   * while editing a page that already uses it.
   *
   * @param domain - Domain segment to hide.
   * @param actorUserId - Authenticated user performing the change.
   * @returns Updated visible domain list.
   * @throws {@link PageDomainError} When the domain is invalid or the actor lacks permission.
   */
  public static async hidePagePathDomain(
    domain: string,
    actorUserId: string,
  ): Promise<string[]> {
    const normalized = normalizePageDomainSegment(domain);
    if (!normalized) {
      throw new PageDomainError("Enter a valid domain label.", 400);
    }

    const canCreate = await PageDomain.canUserCreatePage(actorUserId);
    if (!canCreate) {
      throw new PageDomainError("You do not have permission to manage page domains.", 403);
    }

    const settings = await PageDomain.loadPagePathSettings();
    settings.hiddenDomains = appendHiddenPagePathDomain(settings.hiddenDomains, normalized);
    settings.customDomains = normalizeCustomPagePathDomains(
      (settings.customDomains ?? []).filter(
        (entry) => normalizePageDomainSegment(entry) !== normalized,
      ),
    );
    await settings.save();

    return PageDomain.listPagePathDomains();
  }

  /**
   * Add a custom domain segment to the institutional page editor picker.
   *
   * @param domain - Domain segment to add.
   * @param actorUserId - Authenticated user performing the change.
   * @returns Updated visible domain list.
   * @throws {@link PageDomainError} When the domain is invalid or the actor lacks permission.
   */
  public static async addPagePathDomain(domain: string, actorUserId: string): Promise<string[]> {
    const validation = validatePagePathDomainSegment(domain);
    if (!validation.valid || !validation.normalized) {
      throw new PageDomainError(validation.error ?? "Enter a valid domain label.", 400);
    }

    const canCreate = await PageDomain.canUserCreatePage(actorUserId);
    if (!canCreate) {
      throw new PageDomainError("You do not have permission to manage page domains.", 403);
    }

    const normalized = validation.normalized;
    const settings = await PageDomain.loadPagePathSettings();
    settings.hiddenDomains = normalizeHiddenPagePathDomains(
      (settings.hiddenDomains ?? []).filter(
        (entry) => normalizePageDomainSegment(entry) !== normalized,
      ),
    );
    settings.customDomains = appendCustomPagePathDomain(settings.customDomains ?? [], normalized);
    await settings.save();

    return PageDomain.listPagePathDomains({ alwaysInclude: [normalized] });
  }

  /**
   * Return normalised hidden domain segments for admin diagnostics.
   *
   * @returns Sorted hidden domain labels.
   */
  public static async listHiddenPagePathDomains(): Promise<string[]> {
    const settings = await PageDomain.loadPagePathSettings();
    return normalizeHiddenPagePathDomains(settings.hiddenDomains);
  }

  /**
   * Search users eligible for delegated page edit grants.
   *
   * @param query - Partial name or login typed in the access picker.
   * @param limit - Maximum rows to return.
   * @returns Candidate rows for the page access combobox.
   */
  public static async searchEditorCandidates(
    query: string,
    limit = 12,
  ): Promise<PageAccessEditorCandidate[]> {
    await connectDB();

    const trimmed = query.trim();
    const capped = Math.min(Math.max(limit, 1), 20);
    const filter = trimmed
      ? {
          $or: [
            { name: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { surname: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { login: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          ],
        }
      : {};

    const docs = await User.find(filter)
      .sort({ name: 1 })
      .limit(capped)
      .select("name surname login avatar")
      .lean();

    return docs
      .map((doc) => {
        const userId = String(doc._id);
        const displayName = resolvePageAccessDisplayName({
          name: doc.name,
          surname: doc.surname,
          login: doc.login,
        });
        if (!displayName) return null;
        const handle = doc.login?.trim();
        return {
          userId,
          displayName,
          subtitle: handle ? `@${handle}` : null,
          avatar: doc.avatar ?? null,
        };
      })
      .filter((row): row is PageAccessEditorCandidate => row != null);
  }

  /**
   * Resolve delegated editor grant rows with display labels.
   *
   * @param userIds - Stored MongoDB user ids.
   * @returns Hydrated grant rows for Puck page settings.
   */
  public static async resolveDelegatedEditorEntries(
    userIds: readonly string[],
  ): Promise<PageAccessEditorEntry[]> {
    if (userIds.length === 0) return [];
    await connectDB();

    const docs = await User.find({ _id: { $in: userIds } })
      .select("name surname login")
      .lean();

    const labelsById = new Map<string, string>();
    for (const doc of docs) {
      const label = resolvePageAccessDisplayName({
        name: doc.name,
        surname: doc.surname,
        login: doc.login,
      });
      if (label) labelsById.set(String(doc._id), label);
    }

    return userIds
      .map((userId) => {
        const trimmed = userId.trim();
        const displayName = labelsById.get(trimmed);
        if (!trimmed || !displayName) return null;
        return { userId: trimmed, displayName };
      })
      .filter((entry): entry is PageAccessEditorEntry => entry != null);
  }

  /**
   * Normalise category labels from a publish payload before MongoDB persistence.
   *
   * @param categories - Raw category strings from the Puck editor or API body.
   * @returns Sanitised unique labels.
   */
  public static normalizeCategoriesForStorage(
    categories: readonly string[] | null | undefined,
  ): string[] {
    return normalizePageCategoryList(categories);
  }

  /**
   * Map a lean page document to a metadata DTO.
   *
   * @param doc - MongoDB page document.
   * @param authorDisplayName - Resolved author display label.
   * @returns Serializable metadata for editor/viewer clients.
   */
  public static toMetadataDto(
    doc: Pick<
      IPage,
      | "path"
      | "title"
      | "published"
      | "categories"
      | "description"
      | "coverImage"
      | "galleryImages"
      | "catalogImagesPerCard"
      | "catalogCardVariant"
      | "authorUserId"
      | "publishAt"
      | "commentsEnabled"
      | "notifyOnPublish"
      | "notifyWebOnPublish"
      | "notifyTelegramOnPublish"
      | "viewCount"
      | "likeCount"
      | "dislikeCount"
      | "createdAt"
      | "updatedAt"
      | "delegatedEditorUserIds"
    >,
    authorDisplayName: string | null = null,
    options: {
      delegatedEditors?: PageAccessEditorEntry[];
      canManagePageAccess?: boolean;
      canManagePagePathDomains?: boolean;
      isPersisted?: boolean;
      telegramPagePublishedTemplate?: string;
      canManageTelegramTemplates?: boolean;
    } = {},
  ): PageMetadataDto {
    return {
      path: doc.path,
      title: doc.title,
      published: doc.published,
      categories: doc.categories ?? [],
      description: doc.description ?? "",
      coverImage: doc.coverImage ?? "",
      galleryImages: doc.galleryImages ?? [],
      catalogImagesPerCard: normalizeNewsCatalogImagesPerCard(doc.catalogImagesPerCard),
      catalogCardVariant: normalizeNewsCatalogPageCardVariant(doc.catalogCardVariant),
      authorUserId: doc.authorUserId ? String(doc.authorUserId) : null,
      authorDisplayName,
      publishAt: doc.publishAt ? new Date(doc.publishAt).toISOString() : null,
      commentsEnabled: doc.commentsEnabled ?? true,
      notifyOnPublish: doc.notifyOnPublish ?? true,
      notifyWebOnPublish: doc.notifyWebOnPublish ?? doc.notifyOnPublish ?? true,
      notifyTelegramOnPublish: doc.notifyTelegramOnPublish ?? doc.notifyOnPublish ?? true,
      commentCount: null,
      viewCount: doc.viewCount ?? 0,
      likeCount: doc.likeCount ?? 0,
      dislikeCount: doc.dislikeCount ?? 0,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      delegatedEditorUserIds: (doc.delegatedEditorUserIds ?? []).map(String),
      delegatedEditors: options.delegatedEditors ?? [],
      canManagePageAccess: options.canManagePageAccess ?? false,
      canManagePagePathDomains: options.canManagePagePathDomains ?? false,
      isPersisted: options.isPersisted ?? true,
      telegramPagePublishedTemplate: options.telegramPagePublishedTemplate,
      canManageTelegramTemplates: options.canManageTelegramTemplates ?? false,
    };
  }

  /**
   * Resolve whether a page is visible on the public viewer route.
   *
   * @param page - Page publication slice.
   * @param now - Reference instant.
   * @returns True when anonymous users may view the page.
   */
  public static isPubliclyVisible(
    page: Pick<IPage, "published" | "publishAt">,
    now: Date = new Date(),
  ): boolean {
    return isPagePubliclyVisible(page, now);
  }

  /**
   * Build an edit-access actor slice from a MongoDB user document.
   *
   * @param user - User document with access fields.
   * @param permissions - Pre-resolved permission keys.
   * @returns Actor slice for {@link canUserEditPage}.
   */
  public static buildEditActor(
    user: Parameters<typeof inferAccessLevelIndex>[0] & { _id: { toString(): string } },
    permissions: PermissionKey[],
  ): PageEditActorSlice {
    return {
      userId: user._id.toString(),
      role: user.role,
      accessLevelIndex: inferAccessLevelIndex(user),
      permissions,
    };
  }

  /**
   * Build ownership slice from a page document.
   *
   * @param page - Page document or lean object.
   * @returns Ownership slice for edit checks.
   */
  public static toOwnershipSlice(
    page: Pick<IPage, "authorUserId" | "delegatedEditorUserIds">,
  ): PageOwnershipSlice {
    return {
      authorUserId: page.authorUserId ? String(page.authorUserId) : null,
      delegatedEditorUserIds: (page.delegatedEditorUserIds ?? []).map(String),
    };
  }

  /**
   * Determine whether a user may edit a persisted page.
   *
   * @param userId - Authenticated user id.
   * @param page - Page ownership fields.
   * @returns True when edit is permitted.
   */
  public static async canUserEditPageDoc(
    userId: string,
    page: PageOwnershipSlice,
  ): Promise<boolean> {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return false;
    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    const actor = PageDomain.buildEditActor(user, permissions);
    return canUserEditPage(actor, page);
  }

  /**
   * Determine whether a user may create a new Puck page.
   *
   * @param userId - Authenticated user id.
   * @returns True when the user may open the editor for a new slug.
   */
  public static async canUserCreatePage(userId: string): Promise<boolean> {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return false;
    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    const actor = PageDomain.buildEditActor(user, permissions);
    return canUserCreatePages(actor);
  }

  /**
   * Assert that a user may edit a page or throw.
   *
   * @param userId - Authenticated user id.
   * @param page - Existing page document or null for new pages.
   * @throws {@link PageDomainError} When edit is forbidden.
   */
  public static async assertUserCanEdit(userId: string, page: IPage | null): Promise<void> {
    if (!page) {
      const canCreate = await PageDomain.canUserCreatePage(userId);
      if (!canCreate) {
        throw new PageDomainError("You do not have permission to create pages.", 403);
      }
      return;
    }

    const allowed = await PageDomain.canUserEditPageDoc(
      userId,
      PageDomain.toOwnershipSlice(page),
    );
    if (!allowed) {
      throw new PageDomainError("You do not have permission to edit this page.", 403);
    }
  }

  /**
   * Resolve author display name for editor read-only fields.
   *
   * @param authorUserId - MongoDB user id or null.
   * @returns Display name or null.
   */
  public static async resolveAuthorDisplayName(
    authorUserId: string | null | undefined,
  ): Promise<string | null> {
    if (!authorUserId) return null;
    await connectDB();
    const user = await User.findById(authorUserId).lean();
    if (!user) return null;
    return resolveUserDisplayLabel({
      name: user.name,
      surname: user.surname,
      login: user.login,
    });
  }

  /**
   * Load page metadata DTO by path.
   *
   * @param path - Page path key.
   * @returns Metadata or null when missing.
   */
  public static async getMetadataByPath(path: string): Promise<PageMetadataDto | null> {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();
    if (!doc) return null;
    const authorDisplayName = await PageDomain.resolveAuthorDisplayName(
      doc.authorUserId ? String(doc.authorUserId) : null,
    );
    return PageDomain.toMetadataDto(doc, authorDisplayName);
  }

  /**
   * Upsert page content from the Puck editor, applying publication metadata and scheduling.
   *
   * @param input - Save payload from `/api/puck`.
   * @returns Normalised path after save.
   */
  public static async upsertFromEditorSave(input: {
    previousPath: string;
    path: string;
    puckData: PuckData;
    title?: string;
    categories?: string[];
    publication?: PagePublicationInput;
    delegatedEditors?: PageAccessEditorEntry[];
    actorUserId: string;
    actorPermissions: readonly PermissionKey[];
    requestPublish: boolean;
  }): Promise<string> {
    await connectDB();
    const now = new Date();
    const normalizedPath = input.path.trim();
    const previousPath = input.previousPath.trim();
    const publication = input.publication ?? {};
    const existing = await Page.findOne({ path: previousPath }).exec();
    const priorPublication = {
      published: existing?.published ?? false,
      publishAt: existing?.publishAt ?? null,
    };
    const notifyOnPublish = resolvePageNotifyOnPublish(
      publication.notifyOnPublish,
      existing?.notifyOnPublish,
    );
    const notifyWebOnPublish = resolvePageNotifyWebOnPublish(
      publication.notifyWebOnPublish,
      existing?.notifyWebOnPublish,
      notifyOnPublish,
    );
    const notifyTelegramOnPublish = resolvePageNotifyTelegramOnPublish(
      publication.notifyTelegramOnPublish,
      existing?.notifyTelegramOnPublish,
      notifyOnPublish,
    );
    const publicationState = resolvePublicationStateOnSave({
      requestPublish: input.requestPublish,
      publishAt: publication.publishAt,
      existingPublished: existing?.published,
      existingPublishAt: existing?.publishAt,
      now,
    });

    await PageDomain.assertUserCanEdit(input.actorUserId, existing);

    const actorUser = await User.findById(input.actorUserId).lean();
    if (!actorUser) {
      throw new PageDomainError("You do not have permission to edit this page.", 403);
    }
    const actor = PageDomain.buildEditActor(actorUser, [...input.actorPermissions]);
    const ownership = existing ? PageDomain.toOwnershipSlice(existing) : null;
    const mayManageAccess = canManagePageAccess(actor, ownership);

    if (previousPath !== normalizedPath) {
      const conflict = await Page.findOne({ path: normalizedPath }).lean();
      if (conflict) {
        throw new PageDomainError(`The path "${normalizedPath}" is already taken.`, 409);
      }
    }

    const setFields: Record<string, unknown> = {
      path: normalizedPath,
      puckData: input.puckData,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.categories !== undefined && {
        categories: PageDomain.normalizeCategoriesForStorage(input.categories),
      }),
      description: (publication.description ?? existing?.description ?? "").trim(),
      coverImage: (publication.coverImage ?? existing?.coverImage ?? "").trim(),
      galleryImages:
        publication.galleryImages !== undefined
          ? normalizePageGalleryImages(publication.galleryImages)
          : existing?.galleryImages ?? [],
      catalogImagesPerCard:
        publication.catalogImagesPerCard !== undefined
          ? normalizeNewsCatalogImagesPerCard(publication.catalogImagesPerCard)
          : normalizeNewsCatalogImagesPerCard(existing?.catalogImagesPerCard),
      catalogCardVariant:
        publication.catalogCardVariant !== undefined
          ? normalizeNewsCatalogPageCardVariant(publication.catalogCardVariant)
          : normalizeNewsCatalogPageCardVariant(existing?.catalogCardVariant),
      commentsEnabled: publication.commentsEnabled ?? existing?.commentsEnabled ?? true,
      notifyOnPublish,
      notifyWebOnPublish,
      notifyTelegramOnPublish,
      publishAt: publicationState.publishAt,
      published: publicationState.published,
    };

    if (mayManageAccess && input.delegatedEditors !== undefined) {
      setFields.delegatedEditorUserIds = normalizeDelegatedEditorsForStorage(
        input.delegatedEditors,
        existing?.authorUserId ? String(existing.authorUserId) : input.actorUserId,
      );
    }

    if (!existing) {
      setFields.authorUserId = input.actorUserId;
    }

    if (previousPath !== normalizedPath && existing) {
      await Page.findOneAndUpdate(
        { path: previousPath },
        { $set: setFields },
        { returnDocument: "after" },
      );
      await PageLike.updateMany(
        { pagePath: previousPath },
        { $set: { pagePath: normalizedPath } },
      );
      await SchedulerDomain.cancelEvent(publishPageIdempotencyKey(previousPath));
    } else {
      await Page.findOneAndUpdate(
        { path: previousPath },
        { $set: setFields },
        { upsert: true, returnDocument: "after" },
      );
    }

    const idempotencyKey = publishPageIdempotencyKey(normalizedPath);
    if (input.requestPublish) {
      if (publicationState.scheduledFuture && publicationState.publishAt) {
        await SchedulerDomain.scheduleEvent({
          eventType: SCHEDULED_EVENT_TYPES.publish_page,
          dueAt: publicationState.publishAt,
          payload: { path: normalizedPath },
          idempotencyKey,
        });
      } else {
        await SchedulerDomain.cancelEvent(idempotencyKey);
      }
    }

    const pageTitle =
      input.title?.trim() || existing?.title?.trim() || normalizedPath.split("/").pop() || "New page";
    const pageDescription = (publication.description ?? existing?.description ?? "").trim();

    if (
      publicationState.published &&
      !publicationState.scheduledFuture &&
      shouldDispatchPageGoLiveNotifications({
        notifyOnPublish,
        priorPublication,
      })
    ) {
      const authorUserId = existing?.authorUserId
        ? String(existing.authorUserId)
        : input.actorUserId;
      await dispatchPageGoLiveNotifications({
        path: normalizedPath,
        title: pageTitle,
        description: pageDescription,
        notifyOnPublish,
        notifyWebOnPublish,
        notifyTelegramOnPublish,
        authorUserId,
      }).catch(() => undefined);
    }

    if (
      publicationState.published &&
      !publicationState.scheduledFuture &&
      shouldDispatchPageMentionNotifications(priorPublication)
    ) {
      const authorUserId = existing?.authorUserId
        ? String(existing.authorUserId)
        : input.actorUserId;
      await dispatchPageMentionNotifications({
        path: normalizedPath,
        title: pageTitle,
        puckData: input.puckData,
        authorUserId,
      }).catch(() => undefined);
    }

    return normalizedPath;
  }

  /**
   * Publish a page when its scheduled `publishAt` time is reached.
   *
   * @param path - Page path key.
   */
  public static async executeScheduledPublish(path: string): Promise<void> {
    await connectDB();
    const doc = await Page.findOne({ path }).exec();
    if (!doc) {
      throw new Error(`Page not found at "${path}".`);
    }

    const priorPublication = {
      published: doc.published,
      publishAt: doc.publishAt,
    };
    const notifyOnPublish = doc.notifyOnPublish ?? true;
    const notifyWebOnPublish = doc.notifyWebOnPublish ?? notifyOnPublish;
    const notifyTelegramOnPublish = doc.notifyTelegramOnPublish ?? notifyOnPublish;

    doc.published = true;
    doc.publishAt = null;
    await doc.save();

    if (
      shouldDispatchPageGoLiveNotifications({
        notifyOnPublish,
        priorPublication,
      })
    ) {
      await dispatchPageGoLiveNotifications({
        path: doc.path,
        title: doc.title,
        description: doc.description ?? "",
        notifyOnPublish,
        notifyWebOnPublish,
        notifyTelegramOnPublish,
        authorUserId: doc.authorUserId ? String(doc.authorUserId) : null,
      }).catch(() => undefined);
    }

    if (shouldDispatchPageMentionNotifications(priorPublication)) {
      await dispatchPageMentionNotifications({
        path: doc.path,
        title: doc.title,
        puckData: doc.puckData,
        authorUserId: doc.authorUserId ? String(doc.authorUserId) : null,
      }).catch(() => undefined);
    }
  }

  /**
   * Increment the view counter when dedupe allows.
   *
   * @param path - Page path.
   * @param existingCookieValue - Current dedupe cookie value.
   * @returns New view count after increment, or current count when deduped.
   */
  public static async recordView(
    path: string,
    existingCookieValue: string | undefined,
  ): Promise<{ viewCount: number; counted: boolean }> {
    await connectDB();
    const normalizedPath = normalizePagePath(path);
    const doc = await Page.findOne({ path: normalizedPath }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      return { viewCount: 0, counted: false };
    }

    if (!shouldIncrementPageView(existingCookieValue)) {
      return { viewCount: doc.viewCount ?? 0, counted: false };
    }

    const updated = await Page.findOneAndUpdate(
      { path: normalizedPath },
      { $inc: { viewCount: 1 } },
      { returnDocument: "after" },
    ).lean();

    return { viewCount: updated?.viewCount ?? doc.viewCount ?? 0, counted: true };
  }

  /**
   * Toggle the current user's like on a page.
   *
   * Adding a like clears an existing dislike so both cannot be active together.
   *
   * @param path - Page path.
   * @param userId - Authenticated user id.
   * @returns Updated like/dislike flags and counts.
   */
  public static async toggleLike(
    path: string,
    userId: string,
  ): Promise<{
    liked: boolean;
    likeCount: number;
    disliked: boolean;
    dislikeCount: number;
  }> {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      throw new PageDomainError("Page not found.", 404);
    }

    const existingLike = await PageLike.findOne({ pagePath: path, userId }).lean();
    if (existingLike) {
      await PageLike.deleteOne({ _id: existingLike._id });
      await Page.updateOne({ path }, { $inc: { likeCount: -1 } });
      return PageDomain.readPageEngagementState(path, userId);
    }

    const existingDislike = await PageDislike.findOne({ pagePath: path, userId }).lean();
    if (existingDislike) {
      await PageDislike.deleteOne({ _id: existingDislike._id });
      await Page.updateOne({ path }, { $inc: { dislikeCount: -1 } });
    }

    await PageLike.create({ pagePath: path, userId });
    await Page.updateOne({ path }, { $inc: { likeCount: 1 } });
    return PageDomain.readPageEngagementState(path, userId);
  }

  /**
   * Toggle the current user's dislike on a page.
   *
   * Adding a dislike clears an existing like so both cannot be active together.
   *
   * @param path - Page path.
   * @param userId - Authenticated user id.
   * @returns Updated like/dislike flags and counts.
   */
  public static async toggleDislike(
    path: string,
    userId: string,
  ): Promise<{
    liked: boolean;
    likeCount: number;
    disliked: boolean;
    dislikeCount: number;
  }> {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      throw new PageDomainError("Page not found.", 404);
    }

    const existingDislike = await PageDislike.findOne({ pagePath: path, userId }).lean();
    if (existingDislike) {
      await PageDislike.deleteOne({ _id: existingDislike._id });
      await Page.updateOne({ path }, { $inc: { dislikeCount: -1 } });
      return PageDomain.readPageEngagementState(path, userId);
    }

    const existingLike = await PageLike.findOne({ pagePath: path, userId }).lean();
    if (existingLike) {
      await PageLike.deleteOne({ _id: existingLike._id });
      await Page.updateOne({ path }, { $inc: { likeCount: -1 } });
    }

    await PageDislike.create({ pagePath: path, userId });
    await Page.updateOne({ path }, { $inc: { dislikeCount: 1 } });
    return PageDomain.readPageEngagementState(path, userId);
  }

  /**
   * Read the current user's page engagement flags and denormalized counters.
   *
   * @param path - Page path.
   * @param userId - Authenticated user id.
   * @returns Synchronised engagement snapshot.
   */
  public static async readPageEngagementState(
    path: string,
    userId: string,
  ): Promise<{
    liked: boolean;
    likeCount: number;
    disliked: boolean;
    dislikeCount: number;
  }> {
    const [page, liked, disliked] = await Promise.all([
      Page.findOne({ path }).lean(),
      PageLike.exists({ pagePath: path, userId }),
      PageDislike.exists({ pagePath: path, userId }),
    ]);

    const likeCount = Math.max(0, page?.likeCount ?? 0);
    const dislikeCount = Math.max(0, page?.dislikeCount ?? 0);

    if (
      page &&
      (page.likeCount !== likeCount || page.dislikeCount !== dislikeCount)
    ) {
      await Page.updateOne({ path }, { $set: { likeCount, dislikeCount } });
    }

    return {
      liked: Boolean(liked),
      likeCount,
      disliked: Boolean(disliked),
      dislikeCount,
    };
  }

  /**
   * Check whether a user has disliked a page.
   *
   * @param path - Page path.
   * @param userId - User id or null.
   * @returns True when a dislike row exists.
   */
  public static async hasUserDisliked(path: string, userId: string | null): Promise<boolean> {
    if (!userId) return false;
    await connectDB();
    const row = await PageDislike.findOne({ pagePath: path, userId }).lean();
    return Boolean(row);
  }

  /**
   * Check whether a user has liked a page.
   *
   * @param path - Page path.
   * @param userId - User id or null.
   * @returns True when a like row exists.
   */
  public static async hasUserLiked(path: string, userId: string | null): Promise<boolean> {
    if (!userId) return false;
    await connectDB();
    const row = await PageLike.findOne({ pagePath: path, userId }).lean();
    return Boolean(row);
  }

  /**
   * Create or rotate a publisher invite link for a persisted page.
   *
   * @param pagePath - MongoDB page path key.
   * @param actorUserId - Authenticated user creating the invite.
   * @returns Invite URL payload for the client (plain token returned once).
   * @throws {@link PageDomainError} When the page is missing or the actor cannot manage access.
   */
  public static async createPublisherInviteLink(
    pagePath: string,
    actorUserId: string,
  ): Promise<{ token: string; expiresAt: Date; pagePath: string }> {
    await connectDB();
    const normalizedPath = normalizePagePath(pagePath);
    const doc = await Page.findOne({ path: normalizedPath }).exec();
    if (!doc) {
      throw new PageDomainError(`No page found at "${normalizedPath}".`, 404);
    }

    const user = await User.findById(actorUserId).lean();
    if (!user) {
      throw new PageDomainError("Unauthorised.", 401);
    }

    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    const actor = PageDomain.buildEditActor(user, permissions);
    if (!canManagePageAccess(actor, PageDomain.toOwnershipSlice(doc))) {
      throw new PageDomainError("You do not have permission to share publisher invites.", 403);
    }

    const token = generatePagePublisherInviteToken();
    const expiresAt = computePagePublisherInviteExpiry();
    doc.publisherInvite = {
      tokenHash: hashPagePublisherInviteToken(token),
      expiresAt,
      createdBy: user._id,
    };
    await doc.save();

    return { token, expiresAt, pagePath: normalizedPath };
  }

  /**
   * Redeem a publisher invite link for the signed-in user.
   *
   * @param token - Plain invite token from the URL.
   * @param actorUserId - Authenticated redeemer id.
   * @returns Target page path and whether the user was newly added.
   * @throws {@link PageDomainError} When the invite is invalid or the roster is full.
   */
  public static async redeemPublisherInvite(
    token: string,
    actorUserId: string,
  ): Promise<{ pagePath: string; alreadyMember: boolean }> {
    await connectDB();
    const digest = hashPagePublisherInviteToken(token);
    const doc = await Page.findOne({ "publisherInvite.tokenHash": digest }).exec();
    if (!doc) {
      throw new PageDomainError("This invite link is invalid or has expired.", 404);
    }

    const invite = doc.publisherInvite as PagePublisherInviteRecord | null | undefined;
    const validation = validatePagePublisherInviteToken(token, invite ? {
      tokenHash: invite.tokenHash,
      expiresAt: invite.expiresAt,
      createdBy: String(invite.createdBy),
    } : null);

    if (!validation.ok) {
      const message =
        validation.reason === "expired"
          ? "This invite link has expired."
          : "This invite link is invalid or has expired.";
      throw new PageDomainError(message, 410);
    }

    const authorUserId = doc.authorUserId ? String(doc.authorUserId) : null;
    const delegatedIds = (doc.delegatedEditorUserIds ?? []).map(String);

    if (hasPagePublisherAccess(actorUserId, authorUserId, delegatedIds)) {
      return { pagePath: doc.path, alreadyMember: true };
    }

    const delegatedEntries = await PageDomain.resolveDelegatedEditorEntries(delegatedIds);
    const candidateEntry = await PageDomain.resolveDelegatedEditorEntries([actorUserId]);
    const nextEntry = candidateEntry[0];
    if (!nextEntry) {
      throw new PageDomainError("Unable to resolve your profile for publisher access.", 400);
    }

    const nextIds = normalizeDelegatedEditorsForStorage(
      [...delegatedEntries, nextEntry],
      authorUserId ?? undefined,
    );

    if (nextIds.length === delegatedIds.length) {
      throw new PageDomainError("This page already has the maximum number of publishers.", 409);
    }

    doc.delegatedEditorUserIds = nextIds.map((id) => new Types.ObjectId(id));
    await doc.save();

    return { pagePath: doc.path, alreadyMember: false };
  }

  /**
   * Rename a persisted page path (used when moving a page across path domains).
   *
   * @param input - Source and destination absolute paths.
   * @returns The normalized destination path.
   */
  public static async renamePagePath(input: {
    fromPath: string;
    toPath: string;
  }): Promise<string> {
    await connectDB();

    const fromPath = normalizePagePath(input.fromPath);
    const toPath = normalizePagePath(input.toPath);

    if (!fromPath || fromPath === "/" || !toPath || toPath === "/") {
      throw new PageDomainError("Invalid page path.", 400);
    }

    if (fromPath === toPath) {
      return toPath;
    }

    const existing = await Page.findOne({ path: fromPath }).exec();
    if (!existing) {
      throw new PageDomainError("Page not found.", 404);
    }

    const conflict = await Page.findOne({ path: toPath }).lean();
    if (conflict) {
      throw new PageDomainError(`The path "${toPath}" is already taken.`, 409);
    }

    await Page.findOneAndUpdate({ path: fromPath }, { $set: { path: toPath } });
    await PageLike.updateMany({ pagePath: fromPath }, { $set: { pagePath: toPath } });
    await PageDislike.updateMany({ pagePath: fromPath }, { $set: { pagePath: toPath } });
    await SchedulerDomain.cancelEvent(publishPageIdempotencyKey(fromPath));

    if (existing.published && existing.publishAt) {
      const publishAt = existing.publishAt instanceof Date
        ? existing.publishAt
        : new Date(String(existing.publishAt));
      if (!Number.isNaN(publishAt.getTime()) && publishAt.getTime() > Date.now()) {
        await SchedulerDomain.scheduleEvent({
          eventType: SCHEDULED_EVENT_TYPES.publish_page,
          dueAt: publishAt,
          payload: { path: toPath },
          idempotencyKey: publishPageIdempotencyKey(toPath),
        });
      }
    }

    return toPath;
  }
}

/**
 * Notify users @mentioned in page content when a page becomes public for the first time.
 *
 * The page author is excluded even when they mention themselves. Delivery respects each
 * recipient's notification channel preferences. Failures are swallowed so publishing
 * never rolls back.
 *
 * @param input - Go-live page snapshot with Puck content and author id.
 */
async function dispatchPageMentionNotifications(input: {
  path: string;
  title: string;
  puckData: unknown;
  authorUserId: string | null;
}): Promise<void> {
  const recipientIds = resolvePageMentionNotificationRecipients(
    collectUserMentionIdsFromPuckData(input.puckData),
    input.authorUserId,
  );
  if (recipientIds.length === 0) return;

  await connectDB();

  const authorName = input.authorUserId
    ? await PageDomain.resolveAuthorDisplayName(input.authorUserId)
    : null;
  const { title, body } = buildPageMentionNotificationCopy(input.title, authorName);
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const actionHref = buildPagePublishActionHref(baseUrl, input.path);
  const telegramText = buildPageMentionTelegramMessage(title, body, actionHref);
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  const users = await User.find({ _id: { $in: recipientIds } })
    .select("_id telegramId notificationChannels")
    .lean();

  for (const user of users) {
    const userId = String(user._id);
    const wantsWeb = userAcceptsNotificationChannel(user.notificationChannels, "web");
    const wantsTelegram = userAcceptsNotificationChannel(user.notificationChannels, "telegram");
    const channels: NotificationInboxChannel[] = [];

    if (wantsWeb) channels.push("web");
    if (wantsTelegram) channels.push("telegram");
    if (channels.length === 0) continue;

    await NotificationDomain.recordNotification({
      userId,
      kind: "page_mention",
      deliveryKey: buildInboxDeliveryKey("page_mention", input.path, userId),
      title,
      body,
      variant: "info",
      actionHref: input.path,
      sourceId: input.path,
      channels,
    }).catch(() => undefined);

    if (
      wantsTelegram &&
      botToken &&
      typeof user.telegramId === "number" &&
      user.telegramId > 0
    ) {
      await TelegramBotDomain.sendDirectMessage(botToken, user.telegramId, telegramText).catch(
        () => undefined,
      );
    }
  }
}

/**
 * Notify institution members when a page becomes public for the first time.
 *
 * Writes inbox rows for web-enabled users and sends Telegram DMs when configured.
 * Failures on individual recipients are swallowed so publishing never rolls back.
 *
 * @param snapshot - Go-live page copy and path.
 */
async function dispatchPageGoLiveNotifications(
  snapshot: PageGoLiveNotificationSnapshot,
): Promise<void> {
  if (!snapshot.notifyOnPublish) return;

  await connectDB();
  await GeneralRulesDomain.ensureLoaded();

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const actionHref = buildPagePublishActionHref(baseUrl, snapshot.path);
  const { title, body } = buildPagePublishNotificationCopy(snapshot.title, snapshot.description);
  const telegramText = formatTelegramPagePublishedMessage(title, body, actionHref);
  const deliveryKey = buildInboxDeliveryKey("page_published", snapshot.path);
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  const users = await User.find({}).select("_id telegramId notificationChannels").lean();

  for (const user of users) {
    const userId = String(user._id);
    if (!shouldReceivePageGoLiveNotification(userId, snapshot.authorUserId)) continue;

    const wantsWeb =
      snapshot.notifyWebOnPublish &&
      userAcceptsNotificationChannel(user.notificationChannels, "web");
    const wantsTelegram =
      snapshot.notifyTelegramOnPublish &&
      userAcceptsNotificationChannel(user.notificationChannels, "telegram");
    const channels: NotificationInboxChannel[] = [];

    if (wantsWeb) channels.push("web");
    if (wantsTelegram) channels.push("telegram");
    if (channels.length === 0) continue;

    await NotificationDomain.recordNotification({
      userId,
      kind: "page_published",
      deliveryKey,
      title,
      body,
      variant: "info",
      actionHref: snapshot.path,
      sourceId: snapshot.path,
      channels,
    }).catch(() => undefined);

    if (
      wantsTelegram &&
      botToken &&
      typeof user.telegramId === "number" &&
      user.telegramId > 0
    ) {
      await TelegramBotDomain.sendDirectMessage(botToken, user.telegramId, telegramText).catch(
        () => undefined,
      );
    }
  }
}
