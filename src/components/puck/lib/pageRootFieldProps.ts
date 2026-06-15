/**
 * @fileoverview Normalize PageRoot sidebar props from grouped fields and legacy `appearance`.
 *
 * Page chapters use the same Puck pattern as block settings — one custom field per
 * {@link FieldChapter} (`pageSettings`, `pageLayout`, `pageBackground`). Legacy pages may
 * still store a combined `appearance` object; render paths merge both shapes.
 *
 * @module src/components/puck/lib/pageRootFieldProps
 */

import type { PageAppearanceProps } from "@/components/puck/fields/PageAppearanceFieldGroup";
import type { PageBackgroundProps } from "@/components/puck/fields/PageBackgroundFieldGroup";
import type { PageLayoutProps } from "@/components/puck/fields/PageLayoutFieldGroup";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import {
  clampPageContentWidth,
  DEFAULT_CONTENT_WIDTH,
} from "@/components/puck/lib/contentWidthTokens";

/** Raw PageRoot props as stored in Puck data (grouped + legacy flat keys). */
export interface PageRootStoredProps {
  pageSettings?: PageSettingsValue;
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
 * Ensure grouped page chapter props exist when loading legacy Puck documents.
 *
 * @param props - Stored root props from Mongo or defaults.
 * @returns Props with `pageLayout` and `pageBackground` populated.
 */
export function ensurePageRootChapterProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const stored = props as PageRootStoredProps;
  const layout = resolvePageLayoutProps(stored);
  const background = resolvePageBackgroundProps(stored);

  return {
    ...props,
    pageLayout: stored.pageLayout ?? layout,
    pageBackground: stored.pageBackground ?? background,
  };
}
