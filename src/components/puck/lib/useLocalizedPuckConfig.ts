/**
 * @fileoverview Locale-aware Puck config — translates drawer category titles at runtime.
 *
 * Block/component definitions stay in `config.tsx`; only user-visible category labels
 * are merged here so module-level block registration stays stable.
 *
 * @module src/components/puck/lib/useLocalizedPuckConfig
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Config } from "@puckeditor/core";
import puckConfig from "@/components/puck/config";

/**
 * Puck config with translated block drawer category titles for the active locale.
 *
 * @returns Localized Puck config object.
 */
export function useLocalizedPuckConfig(): Config {
  const tCategories = useTranslations("puck.blockCategories");

  return useMemo(
    () => ({
      ...puckConfig,
      categories: {
        layout: {
          ...puckConfig.categories.layout,
          title: tCategories("layout"),
        },
        content: {
          ...puckConfig.categories.content,
          title: tCategories("content"),
        },
        news: {
          ...puckConfig.categories.news,
          title: tCategories("news"),
        },
      },
    }),
    [tCategories],
  );
}

export default useLocalizedPuckConfig;
