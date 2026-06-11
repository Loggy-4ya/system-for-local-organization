"use client";

/**
 * @fileoverview Puck.js configuration for Project Nexus.
 *
 * @module src/components/puck/config
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Config } from "@measured/puck";
import { withBlockShell, SPACING_DEFAULTS, ISLAND_DEFAULTS, type SpacingProps, type IslandProps } from "./lib/spacingFields";

import { PageRoot } from "./root/PageRoot";

import { NexusSection } from "./blocks/layout/NexusSection";
import { NexusGrid } from "./blocks/layout/NexusGrid";
import { NexusGridItem } from "./blocks/layout/NexusGridItem";
import { NexusColumns } from "./blocks/layout/NexusColumns";
import { NexusSpacer } from "./blocks/layout/NexusSpacer";

import { NexusHeading } from "./blocks/content/NexusHeading";
import { NexusText } from "./blocks/content/NexusText";
import { NexusImage } from "./blocks/content/NexusImage";
import { NexusDivider } from "./blocks/content/NexusDivider";
import { NexusQuote } from "./blocks/content/NexusQuote";
import { NexusVideo } from "./blocks/content/NexusVideo";
import { NexusAccordion } from "./blocks/content/NexusAccordion";
import { NexusList } from "./blocks/content/NexusList";
import type { ListPositionValue } from "./fields/ListPositionField";
import { NexusButton } from "./blocks/content/NexusButton";
import { NexusTabs } from "./blocks/content/NexusTabs";
import { NexusCarousel } from "./blocks/content/NexusCarousel";
import { NexusInput } from "./blocks/content/NexusInput";

import { NexusNewsCard } from "./blocks/news/NexusNewsCard";

import { NexusUserBadge } from "./blocks/user/NexusUserBadge";
import { NexusStatCard } from "./blocks/user/NexusStatCard";
import { NexusAvatar } from "./blocks/user/NexusAvatar";

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
  const wrapped = withBlockShell(block, componentType);
  if (shellDefaults) {
    const spacing: Partial<SpacingProps> = {};
    const island: Partial<IslandProps> = {};

    for (const [key, value] of Object.entries(shellDefaults)) {
      if (key in SPACING_DEFAULTS) {
        (spacing as Record<string, unknown>)[key] = value;
      } else if (key in ISLAND_DEFAULTS) {
        (island as Record<string, unknown>)[key] = value;
      }
    }

    wrapped.defaultProps = {
      ...wrapped.defaultProps,
      spacing: { ...(wrapped.defaultProps.spacing as SpacingProps), ...spacing },
      island: { ...(wrapped.defaultProps.island as IslandProps), ...island },
    };
  }
  return wrapped as any;
}

/**
 * Merge NexusList vertical position presets into block shell spacing before render.
 *
 * @param props - Puck render props for NexusList.
 * @returns Props with listPosition margins applied to spacing.
 */
function mergeListPositionProps(props: Record<string, unknown>): Record<string, unknown> {
  const listPosition = props.listPosition as ListPositionValue | undefined;
  if (!listPosition) return props;

  const spacing = (props.spacing as Record<string, unknown> | undefined) ?? {};

  return {
    ...props,
    spacing: {
      ...spacing,
      marginTop: listPosition.marginTop ?? spacing.marginTop,
      marginBottom: listPosition.marginBottom ?? spacing.marginBottom,
    },
  };
}

/**
 * Wrap NexusList with block shell plus list position margin merge.
 *
 * @returns Puck component config for NexusList.
 */
function listShellBlock() {
  const wrapped = shellBlock("NexusList", NexusList as any);
  const originalRender = wrapped.render;

  return {
    ...wrapped,
    render: (props: Record<string, unknown>) =>
      originalRender(mergeListPositionProps(props) as never),
  } as any;
}

export const puckConfig = {
  root: PageRoot as any,
  components: {
    NexusSection: shellBlock("NexusSection", NexusSection as any),
    NexusGrid: shellBlock("NexusGrid", NexusGrid as any),
    NexusGridItem: shellBlock("NexusGridItem", NexusGridItem as any),
    NexusColumns: shellBlock("NexusColumns", NexusColumns as any),
    NexusSpacer: shellBlock("NexusSpacer", NexusSpacer as any),

    NexusHeading: shellBlock("NexusHeading", NexusHeading as any, { marginBottom: "sm" }),
    NexusText: shellBlock("NexusText", NexusText as any),
    NexusImage: shellBlock("NexusImage", NexusImage as any),
    NexusDivider: shellBlock("NexusDivider", NexusDivider as any, { marginTop: "md", marginBottom: "md" }),
    NexusQuote: shellBlock("NexusQuote", NexusQuote as any),
    NexusVideo: shellBlock("NexusVideo", NexusVideo as any),
    NexusAccordion: shellBlock("NexusAccordion", NexusAccordion as any),
    NexusList: listShellBlock(),
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
        "NexusDivider",
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
