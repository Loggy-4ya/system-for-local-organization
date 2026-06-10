"use client";

/**
 * @fileoverview Puck.js configuration for Project Nexus.
 *
 * @module src/components/puck/config
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Config } from "@measured/puck";
import { withBlockShell, type BlockShellProps } from "./lib/spacingFields";

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
import { NexusButton } from "./blocks/content/NexusButton";
import { NexusTabs } from "./blocks/content/NexusTabs";
import { NexusInput } from "./blocks/content/NexusInput";

import { NexusNewsCard } from "./blocks/news/NexusNewsCard";

import { NexusUserBadge } from "./blocks/user/NexusUserBadge";
import { NexusStatCard } from "./blocks/user/NexusStatCard";
import { NexusAvatar } from "./blocks/user/NexusAvatar";

/**
 * Wrap a block with shared spacing/lining fields and optional shell defaults.
 *
 * @param block - Raw block export from `blocks/`.
 * @param shellDefaults - Overrides for spacing/lining default props.
 * @returns Block config registered in Puck.
 */
function shellBlock(block: Parameters<typeof withBlockShell>[0], shellDefaults?: Partial<BlockShellProps>) {
  const wrapped = withBlockShell(block);
  if (shellDefaults) {
    wrapped.defaultProps = { ...wrapped.defaultProps, ...shellDefaults };
  }
  return wrapped as any;
}

export const puckConfig = {
  root: PageRoot as any,
  components: {
    NexusSection: shellBlock(NexusSection as any),
    NexusGrid: shellBlock(NexusGrid as any),
    NexusGridItem: shellBlock(NexusGridItem as any),
    NexusColumns: shellBlock(NexusColumns as any),
    NexusSpacer: shellBlock(NexusSpacer as any),

    NexusHeading: shellBlock(NexusHeading as any, { marginBottom: "sm" }),
    NexusText: shellBlock(NexusText as any),
    NexusImage: shellBlock(NexusImage as any),
    NexusDivider: shellBlock(NexusDivider as any, { marginTop: "md", marginBottom: "md" }),
    NexusQuote: shellBlock(NexusQuote as any),
    NexusVideo: shellBlock(NexusVideo as any),
    NexusAccordion: shellBlock(NexusAccordion as any),
    NexusList: shellBlock(NexusList as any),
    NexusButton: shellBlock(NexusButton as any),
    NexusTabs: shellBlock(NexusTabs as any),
    NexusInput: shellBlock(NexusInput as any),

    NexusNewsCard: shellBlock(NexusNewsCard as any),

    NexusUserBadge: shellBlock(NexusUserBadge as any),
    NexusStatCard: shellBlock(NexusStatCard as any),
    NexusAvatar: shellBlock(NexusAvatar as any),
  },
  categories: {
    layout: {
      title: "Layout",
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
        "NexusInput",
      ],
    },
    news: {
      title: "News & Cards",
      components: ["NexusNewsCard"],
    },
    user: {
      title: "User & Data",
      components: ["NexusUserBadge", "NexusStatCard", "NexusAvatar"],
    },
  },
} satisfies Config;

export default puckConfig;
