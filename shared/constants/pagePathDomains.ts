/**
 * @fileoverview Default first-segment domains for Puck page URLs.
 *
 * Pages may be addressed as `/domain/page_slug` (e.g. `/news/spring-fair`).
 *
 * @module shared/constants/pagePathDomains
 */

/** Built-in domain segments suggested in the page editor. */
export const DEFAULT_PAGE_PATH_DOMAINS = ["news", "surveys"] as const;

/** First path segments reserved for built-in app routes — cannot be page domains. */
export const RESERVED_PAGE_PATH_DOMAINS = new Set([
  "edit",
  "pages",
  "api",
  "telegram",
  "login",
  "signup",
  "profile",
  "admin",
  "users",
]);

/** Default domain segment union type. */
export type DefaultPagePathDomain = (typeof DEFAULT_PAGE_PATH_DOMAINS)[number];
