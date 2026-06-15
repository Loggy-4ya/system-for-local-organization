"use client";

/**
 * @fileoverview Lucide icon mapping for Puck editor UI (drawer, fields, categories).
 *
 * @module src/components/puck/lib/puckIcons
 */

import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Box,
  ChevronDown,
  CircleUser,
  Columns2,
  FileText,
  Film,
  Grid3x3,
  Heading1,
  Image,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  List,
  MessageSquareQuote,
  MousePointerClick,
  Newspaper,
  PanelTop,
  Quote,
  Rows3,
  SeparatorHorizontal,
  Settings2,
  Sparkles,
  Square,
  TextCursorInput,
  Type,
  User,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

const ICON_SIZE = 14;
const ICON_STROKE = 1.75;

/**
 * Render a Lucide icon at the standard Puck sidebar size (14px — see `.ai/docs/icon_sizes.md`).
 *
 * @param Icon - Lucide icon component.
 * @returns Sized SVG element.
 */
export function puckIcon(Icon: LucideIcon): ReactNode {
  return <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />;
}

/** Icons for Puck component drawer items keyed by component type name. */
export const COMPONENT_ICONS: Record<string, LucideIcon> = {
  NexusSection: LayoutTemplate,
  NexusGrid: LayoutGrid,
  NexusGridItem: Square,
  NexusColumns: Columns2,
  NexusSpacer: SeparatorHorizontal,
  NexusHeading: Heading1,
  NexusText: FileText,
  NexusImage: Image,
  NexusQuote: Quote,
  NexusVideo: Video,
  NexusAccordion: ChevronDown,
  NexusList: List,
  NexusButton: MousePointerClick,
  NexusTabs: PanelTop,
  NexusCarousel: Images,
  NexusInput: TextCursorInput,
  NexusNewsCard: Newspaper,
  NexusUserBadge: User,
  NexusStatCard: Sparkles,
  NexusAvatar: CircleUser,
};

/** Icons for Puck sidebar category titles. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  layout: Rows3,
  content: Type,
  news: Newspaper,
  user: CircleUser,
};

/** Icons for common field labels (normalized lowercase keys). */
export const FIELD_LABEL_ICONS: Record<string, LucideIcon> = {
  "text content": FileText,
  "tab content": Box,
  "tab label": Type,
  tabs: PanelTop,
  slides: Images,
  alignment: AlignLeft,
  "text color": Type,
  "font size": Type,
  "font family": Type,
  "font weight": Type,
  "line height": Rows3,
  spacing: Grid3x3,
  island: Box,
  background: Settings2,
  padding: Grid3x3,
  margin: Grid3x3,
  image: Image,
  "image source": Image,
  video: Film,
  link: Link2,
  "link url": Link2,
  title: Heading1,
  caption: MessageSquareQuote,
};

/**
 * Resolve an icon for a Puck field label.
 *
 * @param label - Human-readable field label.
 * @returns Lucide icon node or undefined.
 */
export function fieldLabelIcon(label: string): ReactNode | undefined {
  const key = label.trim().toLowerCase();
  const Icon = FIELD_LABEL_ICONS[key];
  return Icon ? puckIcon(Icon) : undefined;
}

/**
 * Resolve an icon for a Puck component drawer item.
 *
 * @param name - Component type key (e.g. `NexusText`).
 * @returns Lucide icon node or undefined.
 */
export function componentDrawerIcon(name: string): ReactNode | undefined {
  const Icon = COMPONENT_ICONS[name];
  return Icon ? puckIcon(Icon) : undefined;
}
