"use client";

/**
 * @fileoverview Puck.js configuration for Project Nexus.
 *
 * Defines the full component block registry and categories that map 1:1 to Figma
 * component names and the `NexusPuck*` block names documented in
 * `.ai/docs/features/figma_ui_integration.md` Section 4.
 *
 * @module src/components/puck/config
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Config } from "@measured/puck";

// ── Root Config ──────────────────────────────────────────────────────────────
import { PageRoot } from "./root/PageRoot";

// ── Layout Blocks ────────────────────────────────────────────────────────────
import { NexusSection } from "./blocks/layout/NexusSection";
import { NexusGrid } from "./blocks/layout/NexusGrid";
import { NexusGridItem } from "./blocks/layout/NexusGridItem";
import { NexusColumns } from "./blocks/layout/NexusColumns";
import { NexusSpacer } from "./blocks/layout/NexusSpacer";

// ── Content Blocks ───────────────────────────────────────────────────────────
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

// ── News Blocks ──────────────────────────────────────────────────────────────
import { NexusNewsCard } from "./blocks/news/NexusNewsCard";

// ── User Blocks ──────────────────────────────────────────────────────────────
import { NexusUserBadge } from "./blocks/user/NexusUserBadge";
import { NexusStatCard } from "./blocks/user/NexusStatCard";
import { NexusAvatar } from "./blocks/user/NexusAvatar";

// ── Root Configuration ────────────────────────────────────────────────────────

/**
 * Root Puck configuration object exported for use with `<Puck>` and `<Render>`.
 *
 * All component names map 1:1 to Figma component names and the
 * `NexusPuck*` identifiers in `.ai/docs/features/figma_ui_integration.md`.
 */
export const puckConfig = {
  root: PageRoot as any,
  components: {
    // Layout Category
    NexusSection: NexusSection as any,
    NexusGrid: NexusGrid as any,
    NexusGridItem: NexusGridItem as any,
    NexusColumns: NexusColumns as any,
    NexusSpacer: NexusSpacer as any,

    // Content Category
    NexusHeading: NexusHeading as any,
    NexusText: NexusText as any,
    NexusImage: NexusImage as any,
    NexusDivider: NexusDivider as any,
    NexusQuote: NexusQuote as any,
    NexusVideo: NexusVideo as any,
    NexusAccordion: NexusAccordion as any,
    NexusList: NexusList as any,
    NexusButton: NexusButton as any,
    NexusTabs: NexusTabs as any,
    NexusInput: NexusInput as any,

    // News Category
    NexusNewsCard: NexusNewsCard as any,

    // User Category
    NexusUserBadge: NexusUserBadge as any,
    NexusStatCard: NexusStatCard as any,
    NexusAvatar: NexusAvatar as any,
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
