/**
 * @fileoverview Normalize PageRoot sidebar props from grouped fields and legacy `appearance`.
 *
 * Page chapters use the same Puck pattern as block settings — one custom field per
 * {@link FieldChapter} (`pageSettings`, `pageLayout`, `pageBackground`). Legacy pages may
 * still store a combined `appearance` object; render paths merge both shapes.
 *
 * Tests: `tests/puck/lib/pageRootFieldProps.test.ts` — `npm run test:page-root-field-props`
 *
 * @module src/components/puck/lib/pageRootFieldProps
 */

import type { PageAppearanceProps } from "@/components/puck/fields/PageAppearanceFieldGroup";
import type { PageBackgroundProps } from "@/components/puck/fields/PageBackgroundFieldGroup";
import type { PageLayoutProps } from "@/components/puck/fields/PageLayoutFieldGroup";
import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import { normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import {
  clampPageContentWidth,
  DEFAULT_CONTENT_WIDTH,
} from "@/components/puck/lib/contentWidthTokens";

/** Puck default placeholder when a page has no custom title yet. */
export const DEFAULT_PAGE_TITLE = "Untitled Page";

/**
 * Resolve the editor sidebar title from puck root props and MongoDB fallback.
 *
 * Legacy puck documents often keep the default placeholder in `pageSettings.title`
 * while `Page.title` already holds the real name — prefer the database title in
 * that case so blur commits do not revert to "Untitled Page".
 *
 * @param existingPageSettings - Grouped page settings from puck root props.
 * @param legacyRootTitle - Deprecated flat `root.props.title` value.
 * @param dbTitle - MongoDB `Page.title` from the server.
 * @returns Title seeded into `pageSettings` for the editor.
 */
export function resolveEditorPageSettingsTitle(
  existingPageSettings?: Pick<PageSettingsValue, "title">,
  legacyRootTitle?: string,
  dbTitle?: string,
): string {
  const puckTitle = (existingPageSettings?.title ?? legacyRootTitle ?? "").trim();
  const mongoTitle = (dbTitle ?? "").trim();

  if (puckTitle && puckTitle !== DEFAULT_PAGE_TITLE) {
    return puckTitle;
  }
  if (mongoTitle) {
    return mongoTitle;
  }
  return puckTitle || DEFAULT_PAGE_TITLE;
}

/** Raw PageRoot props as stored in Puck data (grouped + legacy flat keys). */
export interface PageRootStoredProps {
  pageSettings?: PageSettingsValue;
  pagePublication?: PagePublicationValue;
  pageLayout?: PageLayoutProps;
  pageBackground?: PageBackgroundProps;
  /** @deprecated Combined layout + background — migrated into chapter fields on read. */
  appearance?: PageAppearanceProps;
  /** @deprecated Flat title before `pageSettings` grouping. */
  title?: string;
  background?: PageAppearanceProps["background"];
  backgroundPreset?: string;
  backgroundImage?: string;
}

/**
 * Resolve layout chapter props with legacy `appearance` fallback.
 *
 * @param props - Stored PageRoot props.
 * @returns Layout chapter value for the Puck field.
 */
export function resolvePageLayoutProps(props: PageRootStoredProps): PageLayoutProps {
  return {
    contentWidth: clampPageContentWidth(
      props.pageLayout?.contentWidth ??
        props.appearance?.contentWidth ??
        DEFAULT_CONTENT_WIDTH,
    ),
  };
}

/**
 * Resolve background chapter props with legacy `appearance` / flat fallback.
 *
 * @param props - Stored PageRoot props.
 * @returns Background chapter value for the Puck field.
 */
export function resolvePageBackgroundProps(props: PageRootStoredProps): PageBackgroundProps {
  return {
    background:
      props.pageBackground?.background ??
      props.appearance?.background ??
      props.background ??
      "site-default",
    backgroundGridMotion:
      props.pageBackground?.backgroundGridMotion ??
      props.appearance?.backgroundGridMotion ??
      "dynamic",
    backgroundPreset:
      props.pageBackground?.backgroundPreset ??
      props.appearance?.backgroundPreset ??
      props.backgroundPreset,
    backgroundImage:
      props.pageBackground?.backgroundImage ??
      props.appearance?.backgroundImage ??
      props.backgroundImage,
  };
}

/**
 * Merge chapter fields and legacy storage into one appearance shape for render.
 *
 * @param props - Stored PageRoot props.
 * @returns Normalized appearance for PageRoot render and scrollport grid.
 */
export function resolvePageRootAppearance(props: PageRootStoredProps): PageAppearanceProps {
  const layout = resolvePageLayoutProps(props);
  const background = resolvePageBackgroundProps(props);

  return {
    ...background,
    contentWidth: layout.contentWidth,
  };
}

/**
 * Whether the layout-level {@link InfiniteGrid} should freeze tile scroll for this page.
 *
 * Static motion applies only when the page uses the site-default grid background.
 *
 * @param props - Stored PageRoot props.
 * @returns True when grid motion is static.
 */
export function resolvePageBackgroundGridIsStatic(props: PageRootStoredProps): boolean {
  const background = resolvePageBackgroundProps(props);
  return (
    background.background === "site-default" &&
    (background.backgroundGridMotion ?? "dynamic") === "static"
  );
}

/**
 * Resolve publication chapter props with MongoDB fallback defaults.
 *
 * @param props - Stored PageRoot props.
 * @param metaDefaults - Server metadata when puck props are empty.
 * @returns Publication chapter value for the Puck field.
 */
export function resolvePagePublicationProps(
  props: PageRootStoredProps,
  metaDefaults?: Partial<PagePublicationValue>,
): PagePublicationValue {
  const legacyEditors = props.pageSettings?.delegatedEditors;

  return {
    description: props.pagePublication?.description ?? metaDefaults?.description ?? "",
    coverImage: props.pagePublication?.coverImage ?? metaDefaults?.coverImage ?? "",
    galleryImages: props.pagePublication?.galleryImages ?? metaDefaults?.galleryImages ?? [],
    publishAt: props.pagePublication?.publishAt ?? metaDefaults?.publishAt ?? null,
    delegatedEditors:
      props.pagePublication?.delegatedEditors?.length
        ? props.pagePublication.delegatedEditors
        : legacyEditors?.length
          ? legacyEditors
          : metaDefaults?.delegatedEditors ?? [],
    catalogImagesPerCard:
      props.pagePublication?.catalogImagesPerCard ?? metaDefaults?.catalogImagesPerCard ?? 1,
    catalogCardVariant:
      props.pagePublication?.catalogCardVariant ?? metaDefaults?.catalogCardVariant ?? "tile",
    notifyOnPublish:
      props.pagePublication?.notifyOnPublish ?? metaDefaults?.notifyOnPublish ?? true,
    notifyWebOnPublish:
      props.pagePublication?.notifyWebOnPublish ?? metaDefaults?.notifyWebOnPublish ?? true,
    notifyTelegramOnPublish:
      props.pagePublication?.notifyTelegramOnPublish ??
      metaDefaults?.notifyTelegramOnPublish ??
      true,
  };
}

/**
 * Resolve category tags from `pageSettings` with legacy publication fallback.
 *
 * @param props - Stored PageRoot props.
 * @param metaDefaults - Server metadata when puck props are empty.
 * @returns Normalized category labels.
 */
export function resolvePageSettingsCategories(
  props: PageRootStoredProps,
  metaDefaults?: string[],
): string[] {
  const legacyPublicationCategories = props.pagePublication?.categories;
  return normalizePageCategoryList(
    props.pageSettings?.categories?.length
      ? props.pageSettings.categories
      : legacyPublicationCategories?.length
        ? legacyPublicationCategories
        : metaDefaults,
  );
}

/**
 * Ensure grouped page chapter props exist when loading legacy Puck documents.
 *
 * @param props - Stored root props from Mongo or defaults.
 * @param metaDefaults - Optional server metadata for publication defaults.
 * @returns Props with chapter fields populated.
 */
export function ensurePageRootChapterProps(
  props: Record<string, unknown>,
  metaDefaults?: Partial<PagePublicationValue> & { categories?: string[] },
): Record<string, unknown> {
  const stored = props as PageRootStoredProps;
  const layout = resolvePageLayoutProps(stored);
  const background = resolvePageBackgroundProps(stored);
  const publication = resolvePagePublicationProps(stored, metaDefaults);
  const pageSettings = stored.pageSettings ?? {
    title: "Untitled Page",
    slug: "",
    slugLocked: false,
    categories: resolvePageSettingsCategories(stored, metaDefaults?.categories),
  };

  return {
    ...props,
    pageSettings: {
      ...pageSettings,
      categories: resolvePageSettingsCategories(stored, metaDefaults?.categories),
    },
    pageLayout: stored.pageLayout ?? layout,
    pageBackground: stored.pageBackground ?? background,
    pagePublication: stored.pagePublication ?? publication,
  };
}
