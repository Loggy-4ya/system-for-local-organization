"use client";

/**
 * @fileoverview Read-only server metadata for Puck page publication settings.
 *
 * @module src/components/puck/lib/pageEditorMetaContext
 */

import { createContext, useContext, type ReactNode } from "react";
import type { PageMetadataDto } from "@shared/domains/PageDomain";

/** Default empty metadata for new unsaved pages. */
export const EMPTY_PAGE_EDITOR_META: PageMetadataDto = {
  path: "",
  title: "Untitled Page",
  published: false,
  categories: [],
  description: "",
  coverImage: "",
  authorUserId: null,
  authorDisplayName: null,
  publishAt: null,
  commentsEnabled: true,
  viewCount: 0,
  likeCount: 0,
  createdAt: "",
  updatedAt: "",
  delegatedEditorUserIds: [],
  delegatedEditors: [],
  canManagePageAccess: false,
  isPersisted: false,
};

const PageEditorMetaContext = createContext<PageMetadataDto>(EMPTY_PAGE_EDITOR_META);

/** Provider props. */
export interface PageEditorMetaProviderProps {
  value: PageMetadataDto;
  children: ReactNode;
}

/**
 * Supply server-hydrated page metadata to publication sidebar fields.
 *
 * @param props - Metadata value and children.
 * @returns Context provider.
 */
export function PageEditorMetaProvider({ value, children }: PageEditorMetaProviderProps) {
  return (
    <PageEditorMetaContext.Provider value={value}>{children}</PageEditorMetaContext.Provider>
  );
}

/**
 * Read page metadata inside Puck editor field components.
 *
 * @returns Current page metadata from server hydration.
 */
export function usePageEditorMeta(): PageMetadataDto {
  return useContext(PageEditorMetaContext);
}

export default PageEditorMetaContext;
