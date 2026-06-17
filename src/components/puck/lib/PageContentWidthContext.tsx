"use client";

/**
 * @fileoverview Page content width context — block shells align to PageRoot container width.
 *
 * @module src/components/puck/lib/PageContentWidthContext
 */

import React, { createContext, useContext } from "react";
import {
  DEFAULT_CONTENT_WIDTH,
  type ContentWidthToken,
} from "./contentWidthTokens";

const PageContentWidthContext = createContext<ContentWidthToken>(DEFAULT_CONTENT_WIDTH);

/** Props for {@link PageContentWidthProvider}. */
export interface PageContentWidthProviderProps {
  /** Active page layout width token from PageRoot. */
  value: ContentWidthToken;
  children: React.ReactNode;
}

/**
 * Supplies the published / preview page container width to descendant Puck blocks.
 *
 * @param props - Provider props.
 * @returns Context provider JSX.
 */
export function PageContentWidthProvider({ value, children }: PageContentWidthProviderProps) {
  return (
    <PageContentWidthContext.Provider value={value}>{children}</PageContentWidthContext.Provider>
  );
}

/**
 * Read the active page content width token for band / island max-width resolution.
 *
 * @returns Page layout token from nearest {@link PageContentWidthProvider}.
 */
export function usePageContentWidth(): ContentWidthToken {
  return useContext(PageContentWidthContext);
}

export default PageContentWidthProvider;
