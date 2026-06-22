/**
 * @fileoverview Catalog of page-level Nexus template variables.
 *
 * Variables are written in Puck block fields as `${{ name }}` and resolved at render time
 * from the current page's title, publication metadata, and engagement counters.
 *
 * @module shared/constants/nexusPageVariables
 */

/** Supported `${{ variable }}` names for page automation. */
export const NEXUS_PAGE_VARIABLE_NAMES = [
  "title",
  "description",
  "image",
  "coverImage",
  "slug",
  "path",
  "url",
  "categories",
  "author",
  "authorName",
  "views",
  "likes",
  "publishDate",
] as const;

/** Union of supported page variable keys. */
export type NexusPageVariableName = (typeof NEXUS_PAGE_VARIABLE_NAMES)[number];

/** Human-readable descriptions for editor hints and docs. */
export const NEXUS_PAGE_VARIABLE_HINTS: Record<NexusPageVariableName, string> = {
  title: "Page title from Page Details",
  description: "Publication description",
  image: "Publication cover image URL",
  coverImage: "Same as image — publication cover URL",
  slug: "URL slug segment (without leading slash)",
  path: "Canonical page path (e.g. /news/spring-fair)",
  url: "Same as path",
  categories: "Comma-separated category tags",
  author: "Primary publisher display name",
  authorName: "Same as author",
  views: "Public view count",
  likes: "Public like count",
  publishDate: "Scheduled or published date (locale formatted)",
};
