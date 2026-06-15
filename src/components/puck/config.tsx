"use client";

/**
 * @fileoverview Puck.js configuration for Project Nexus.
 *
 * @module src/components/puck/config
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Config } from "@puckeditor/core";
import { BLOCK_FIELD_CHAPTER_CONFIGS } from "./lib/blockFieldChapterConfigs";
import { withFieldChapters } from "./lib/blockFieldChapters";
import { withBlockShell, SPACING_DEFAULTS, ISLAND_DEFAULTS, ROOT_BLOCK_VERTICAL_MARGIN, type SpacingProps, type IslandProps } from "./lib/spacingFields";
import { DEFAULT_ISLAND_COMPONENTS } from "@shared/constants/editorSettings";

import { PageRoot } from "./root/PageRoot";

import { NexusSection } from "./blocks/layout/NexusSection";
import { NexusGrid } from "./blocks/layout/NexusGrid";
import { NexusGridItem } from "./blocks/layout/NexusGridItem";
import { NexusColumns } from "./blocks/layout/NexusColumns";
import { NexusSpacer } from "./blocks/layout/NexusSpacer";

import { NexusHeading } from "./blocks/content/NexusHeading";
import { NexusText } from "./blocks/content/NexusText";
import { NexusImage } from "./blocks/content/NexusImage";
import { NexusQuote } from "./blocks/content/NexusQuote";
import { NexusVideo } from "./blocks/content/NexusVideo";
import { NexusAccordion } from "./blocks/content/NexusAccordion";
import { NexusList } from "./blocks/content/NexusList";
import { NexusButton } from "./blocks/content/NexusButton";
import { NexusTabs } from "./blocks/content/NexusTabs";
import { NexusCarousel } from "./blocks/content/NexusCarousel";
import { NexusInput } from "./blocks/content/NexusInput";

import { NexusNewsCard } from "./blocks/news/NexusNewsCard";

import { NexusUserBadge } from "./blocks/user/NexusUserBadge";
import { NexusStatCard } from "./blocks/user/NexusStatCard";
import { NexusAvatar } from "./blocks/user/NexusAvatar";

/** Default vertical margins for shell-wrapped blocks on the root canvas. */
const ROOT_SHELL_SPACING: Partial<SpacingProps> = {
  marginTop: ROOT_BLOCK_VERTICAL_MARGIN,
  marginBottom: ROOT_BLOCK_VERTICAL_MARGIN,
};

/**
 * Default margin spacing shown in the sidebar for admin island-default component types.
 */
const ISLAND_COMPONENT_MARGIN_DEFAULTS: Partial<SpacingProps> = {
  marginTop: ROOT_BLOCK_VERTICAL_MARGIN,
  marginBottom: ROOT_BLOCK_VERTICAL_MARGIN,
};

/**
 * Wrap a block with shared spacing/lining fields and optional shell defaults.
 *
 * @param componentType - Puck registry key for resolveData island lookup.
 * @param block - Raw block export from `blocks/`.
 * @param shellDefaults - Overrides for spacing/lining default props.
 * @returns Block config registered in Puck.
 */
function shellBlock(
  componentType: string,
  block: Parameters<typeof withBlockShell>[0],
  shellDefaults?: Partial<SpacingProps & IslandProps>,
) {
  const withChapters = withFieldChapters(
    block as Parameters<typeof withFieldChapters>[0],
    BLOCK_FIELD_CHAPTER_CONFIGS[componentType],
  );
  const wrapped = withBlockShell(withChapters as Parameters<typeof withBlockShell>[0], componentType);
  const islandMarginDefaults = DEFAULT_ISLAND_COMPONENTS.includes(componentType)
    ? ISLAND_COMPONENT_MARGIN_DEFAULTS
    : {};

  const spacing: Partial<SpacingProps> = { ...islandMarginDefaults };
  const island: Partial<IslandProps> = {};

  if (shellDefaults) {
    for (const [key, value] of Object.entries(shellDefaults)) {
      if (key in SPACING_DEFAULTS) {
        (spacing as Record<string, unknown>)[key] = value;
      } else if (key in ISLAND_DEFAULTS) {
        (island as Record<string, unknown>)[key] = value;
      }
    }
  }

  if (Object.keys(spacing).length > 0 || Object.keys(island).length > 0) {
    wrapped.defaultProps = {
      ...wrapped.defaultProps,
      spacing: { ...(wrapped.defaultProps.spacing as SpacingProps), ...spacing },
      island: { ...(wrapped.defaultProps.island as IslandProps), ...island },
    };
  }
  return wrapped as any;
}

/**
 * Wrap a block with sidebar field chapters only — no spacing/island shell.
 *
 * Used for inline layout primitives (e.g. {@link NexusGridItem}) where an extra
 * render wrapper would break CSS grid direct-child semantics.
 *
 * @param componentType - Puck registry key for chapter config lookup.
 * @param block - Raw block export from `blocks/`.
 * @returns Block config with grouped sidebar fields.
 */
function chapterOnlyBlock(
  componentType: string,
  block: Parameters<typeof withFieldChapters>[0],
) {
  return withFieldChapters(block, BLOCK_FIELD_CHAPTER_CONFIGS[componentType]) as any;
}

export const puckConfig = {
  root: PageRoot as any,
  components: {
    NexusSection: shellBlock("NexusSection", NexusSection as any, ROOT_SHELL_SPACING),
    NexusGrid: shellBlock("NexusGrid", NexusGrid as any),
    NexusGridItem: chapterOnlyBlock("NexusGridItem", NexusGridItem as any),
    NexusColumns: shellBlock("NexusColumns", NexusColumns as any),
    NexusSpacer: shellBlock("NexusSpacer", NexusSpacer as any),

    NexusHeading: shellBlock("NexusHeading", NexusHeading as any),
    NexusText: shellBlock("NexusText", NexusText as any),
    NexusImage: shellBlock("NexusImage", NexusImage as any),
    NexusQuote: shellBlock("NexusQuote", NexusQuote as any),
    NexusVideo: shellBlock("NexusVideo", NexusVideo as any),
    NexusAccordion: shellBlock("NexusAccordion", NexusAccordion as any),
    NexusList: shellBlock("NexusList", NexusList as any),
    NexusButton: shellBlock("NexusButton", NexusButton as any),
    NexusTabs: shellBlock("NexusTabs", NexusTabs as any),
    NexusCarousel: shellBlock("NexusCarousel", NexusCarousel as any),
    NexusInput: shellBlock("NexusInput", NexusInput as any),

    NexusNewsCard: shellBlock("NexusNewsCard", NexusNewsCard as any),

    NexusUserBadge: shellBlock("NexusUserBadge", NexusUserBadge as any),
    NexusStatCard: shellBlock("NexusStatCard", NexusStatCard as any),
    NexusAvatar: shellBlock("NexusAvatar", NexusAvatar as any),
  },
  categories: {
    layout: {
      title: "Layout",
      defaultExpanded: false,
      components: [
        "NexusSection",
        "NexusGrid",
        "NexusGridItem",
        "NexusColumns",
        "NexusSpacer",
      ],
    },
    content: {
      title: "Content",
      defaultExpanded: false,
      components: [
        "NexusHeading",
        "NexusText",
        "NexusImage",
        "NexusQuote",
        "NexusVideo",
        "NexusAccordion",
        "NexusList",
        "NexusButton",
        "NexusTabs",
        "NexusCarousel",
        "NexusInput",
      ],
    },
    news: {
      title: "News & Cards",
      defaultExpanded: false,
      components: ["NexusNewsCard"],
    },
    user: {
      title: "User & Data",
      defaultExpanded: false,
      components: ["NexusUserBadge", "NexusStatCard", "NexusAvatar"],
    },
  },
} satisfies Config;

export default puckConfig;
