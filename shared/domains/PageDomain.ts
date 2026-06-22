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
  shouldPublishImmediately,
} from "@shared/lib/pagePublicationLogic";
import {
  filterPageCategorySuggestions,
  normalizePageCategoryList,
} from "@shared/lib/pageCategoryLogic";
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
import PagePathSettings, {
  PAGE_PATH_SETTINGS_ID,
  type IPagePathSettings,
} from "@shared/models/PagePathSettings";
import User from "@shared/models/User";
import {
  filterPagePathCatalog,
  type PagePathCatalogEntry,
  mergePagePathDomains,
  normalizePagePath,
  normalizePageDomainSegment,
  toPagePathCatalogEntries,
} from "@shared/lib/pagePathLogic";
import { Types } from "mongoose";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";

/** Publication metadata extracted from Puck root props on save. */
export interface PagePublicationInput {
  description?: string;
  coverImage?: string;
  publishAt?: Date | string | null;
  commentsEnabled?: boolean;
}

/** Serializable page metadata returned to the editor and viewer. */
export interface PageMetadataDto {
  path: string;
  title: string;
  published: boolean;
  categories: string[];
  description: string;
  coverImage: string;
  authorUserId: string | null;
  authorDisplayName: string | null;
  publishAt: string | null;
  commentsEnabled: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  delegatedEditorUserIds: string[];
  /** Hydrated grant rows for the page access picker. */
  delegatedEditors: PageAccessEditorEntry[];
  /** True when the signed-in editor may manage delegated access grants. */
  canManagePageAccess: boolean;
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
   * Merges {@link DEFAULT_PAGE_PATH_DOMAINS} with first segments from stored paths,
   * then removes institution-hidden domains unless they are explicitly included.
   *
   * @param options - Optional domains that must remain visible for the active page.
   * @returns Sorted unique visible domain labels without leading slashes.
   */
  public static async listPagePathDomains(options?: {
    alwaysInclude?: readonly string[];
  }): Promise<string[]> {
    await connectDB();
    const docs = await Page.find({}, { path: 1 }).lean();
    const discovered: string[] = [];

    for (const doc of docs) {
      const normalized = normalizePagePath(doc.path.replace(/^\//, "") || "/");
      if (normalized === "/") continue;
      const first = normalizePageDomainSegment(normalized.replace(/^\//, "").split("/")[0] ?? "");
      if (first) discovered.push(first);
    }

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
      | "authorUserId"
      | "publishAt"
      | "commentsEnabled"
      | "viewCount"
      | "likeCount"
      | "createdAt"
      | "updatedAt"
      | "delegatedEditorUserIds"
    >,
    authorDisplayName: string | null = null,
    options: {
      delegatedEditors?: PageAccessEditorEntry[];
      canManagePageAccess?: boolean;
      isPersisted?: boolean;
    } = {},
  ): PageMetadataDto {
    return {
      path: doc.path,
      title: doc.title,
      published: doc.published,
      categories: doc.categories ?? [],
      description: doc.description ?? "",
      coverImage: doc.coverImage ?? "",
      authorUserId: doc.authorUserId ? String(doc.authorUserId) : null,
      authorDisplayName,
      publishAt: doc.publishAt ? new Date(doc.publishAt).toISOString() : null,
      commentsEnabled: doc.commentsEnabled ?? true,
      viewCount: doc.viewCount ?? 0,
      likeCount: doc.likeCount ?? 0,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      delegatedEditorUserIds: (doc.delegatedEditorUserIds ?? []).map(String),
      delegatedEditors: options.delegatedEditors ?? [],
      canManagePageAccess: options.canManagePageAccess ?? false,
      isPersisted: options.isPersisted ?? true,
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
    const publishAt = normalizePublishAt(publication.publishAt);
    const publishNow =
      input.requestPublish && shouldPublishImmediately(publishAt, now);
    const scheduledFuture =
      input.requestPublish && publishAt != null && publishAt.getTime() > now.getTime();

    const existing = await Page.findOne({ path: previousPath }).exec();

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
      commentsEnabled: publication.commentsEnabled ?? existing?.commentsEnabled ?? true,
      publishAt: scheduledFuture ? publishAt : publishNow ? publishAt : null,
      published: publishNow,
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
    if (scheduledFuture && publishAt) {
      await SchedulerDomain.scheduleEvent({
        eventType: SCHEDULED_EVENT_TYPES.publish_page,
        dueAt: publishAt,
        payload: { path: normalizedPath },
        idempotencyKey,
      });
    } else {
      await SchedulerDomain.cancelEvent(idempotencyKey);
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
    doc.published = true;
    doc.publishAt = null;
    await doc.save();
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
    const doc = await Page.findOne({ path }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      throw new PageDomainError("Page not found.", 404);
    }

    if (!shouldIncrementPageView(existingCookieValue)) {
      return { viewCount: doc.viewCount ?? 0, counted: false };
    }

    const updated = await Page.findOneAndUpdate(
      { path },
      { $inc: { viewCount: 1 } },
      { returnDocument: "after" },
    ).lean();

    return { viewCount: updated?.viewCount ?? doc.viewCount ?? 0, counted: true };
  }

  /**
   * Toggle the current user's like on a page.
   *
   * @param path - Page path.
   * @param userId - Authenticated user id.
   * @returns Updated like state and count.
   */
  public static async toggleLike(
    path: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      throw new PageDomainError("Page not found.", 404);
    }

    const existing = await PageLike.findOne({ pagePath: path, userId }).lean();
    if (existing) {
      await PageLike.deleteOne({ _id: existing._id });
      const updated = await Page.findOneAndUpdate(
        { path },
        { $inc: { likeCount: -1 } },
        { returnDocument: "after" },
      ).lean();
      const likeCount = Math.max(0, updated?.likeCount ?? 0);
      if (likeCount !== updated?.likeCount) {
        await Page.updateOne({ path }, { $set: { likeCount } });
      }
      return { liked: false, likeCount };
    }

    await PageLike.create({ pagePath: path, userId });
    const updated = await Page.findOneAndUpdate(
      { path },
      { $inc: { likeCount: 1 } },
      { returnDocument: "after" },
    ).lean();
    return { liked: true, likeCount: updated?.likeCount ?? 1 };
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
    const normalizedPath = PageDomain.normalizePath(pagePath);
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
}
