"use client";

/**
 * @fileoverview React context for `${{ variable }}` page field automation.
 *
 * @module src/components/puck/lib/nexusPageVariablesContext
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PageMetadataDto } from "@shared/domains/PageDomain";
import {
  buildNexusPageVariableMap,
  interpolateNexusPageVariables,
  type NexusPageVariableMap,
} from "@shared/lib/nexusPageVariables";
import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import { usePageEditorMeta } from "./pageEditorMetaContext";

const NexusPageVariablesContext = createContext<NexusPageVariableMap | null>(null);

/**
 * Merge Puck root fields with hydrated metadata into a variable map.
 *
 * @param pageSettings - Root `pageSettings` chapter value.
 * @param pagePublication - Root `pagePublication` chapter value.
 * @param meta - Server-hydrated page metadata.
 * @returns Variable map for interpolation.
 */
export function buildNexusPageVariablesFromRoot(
  pageSettings: PageSettingsValue | undefined,
  pagePublication: PagePublicationValue | undefined,
  meta: PageMetadataDto,
): NexusPageVariableMap {
  return buildNexusPageVariableMap({
    title: pageSettings?.title ?? meta.title,
    description: pagePublication?.description ?? meta.description,
    coverImage: pagePublication?.coverImage ?? meta.coverImage,
    galleryImages: pagePublication?.galleryImages ?? meta.galleryImages,
    slug: pageSettings?.slug ?? (meta.path === "/" ? "" : meta.path.replace(/^\//, "")),
    path: meta.path,
    categories: pageSettings?.categories ?? meta.categories,
    authorDisplayName: meta.authorDisplayName,
    viewCount: meta.viewCount,
    likeCount: meta.likeCount,
    publishAt: pagePublication?.publishAt ?? meta.publishAt,
  });
}

/** Provider props. */
export interface NexusPageVariablesProviderProps {
  value: NexusPageVariableMap;
  children: ReactNode;
}

/**
 * Supply resolved page variables to Puck block renderers.
 *
 * @param props - Variable map and children.
 * @returns Context provider.
 */
export function NexusPageVariablesProvider({ value, children }: NexusPageVariablesProviderProps) {
  return (
    <NexusPageVariablesContext.Provider value={value}>{children}</NexusPageVariablesContext.Provider>
  );
}

/**
 * Bridge PageRoot props + editor metadata into the variables provider.
 *
 * @param props - Root chapter values and Puck children.
 * @returns Provider wrapping page content blocks.
 */
export function NexusPageVariablesFromRoot({
  pageSettings,
  pagePublication,
  children,
}: {
  pageSettings?: PageSettingsValue;
  pagePublication?: PagePublicationValue;
  children: ReactNode;
}) {
  const meta = usePageEditorMeta();
  const variables = useMemo(
    () => buildNexusPageVariablesFromRoot(pageSettings, pagePublication, meta),
    [
      pageSettings?.title,
      pageSettings?.slug,
      pageSettings?.categories,
      pagePublication?.description,
      pagePublication?.coverImage,
      pagePublication?.galleryImages,
      pagePublication?.publishAt,
      meta.path,
      meta.title,
      meta.description,
      meta.coverImage,
      meta.galleryImages,
      meta.categories,
      meta.authorDisplayName,
      meta.viewCount,
      meta.likeCount,
      meta.publishAt,
    ],
  );

  return <NexusPageVariablesProvider value={variables}>{children}</NexusPageVariablesProvider>;
}

/**
 * Read the current page variable map when inside PageRoot.
 *
 * @returns Variable map or null outside a provider.
 */
export function useNexusPageVariables(): NexusPageVariableMap | null {
  return useContext(NexusPageVariablesContext);
}

/**
 * Interpolate `${{ variable }}` tokens in a Puck field value.
 *
 * @param raw - Stored field string (plain text, HTML, or URL).
 * @returns Interpolated value when a provider is present.
 */
export function useInterpolatedNexusValue(raw: string): string {
  const variables = useNexusPageVariables();
  if (!variables || !raw.includes("${{")) return raw;
  return interpolateNexusPageVariables(raw, variables);
}

export default NexusPageVariablesContext;
