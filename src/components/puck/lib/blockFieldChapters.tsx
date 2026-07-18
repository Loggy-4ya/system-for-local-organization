"use client";

/**
 * @fileoverview Sidebar field chapter grouping for Puck content/layout blocks.
 *
 * Moves flat block fields into collapsed {@link FieldChapter} groups (like spacing/island),
 * nests values under chapter keys in props, and flattens back at render with legacy fallback.
 *
 * @module src/components/puck/lib/blockFieldChapters
 */

import React from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type en from "../../../../messages/en.json";
import { useNexusPuck } from "./useNexusPuck";
import {
  BlockFieldChapterGroup,
  type ChapterCategoryDef,
  type ChapterFieldDef,
} from "../fields/BlockFieldChapterGroup";

/** One labeled category inside a block field chapter. */
export interface BlockFieldChapterCategory {
  /** Uppercase category label shown inside an open chapter. */
  label?: string;
  /** Flat prop keys grouped under this category. */
  fieldKeys: string[];
}

/** Stable keys under `messages/*.json` → `puck.chapters`. */
export type PuckChapterTitleKey = keyof typeof en.puck.chapters;

/** One collapsible sidebar chapter for a block. */
export interface BlockFieldChapter {
  /** Nested prop key (e.g. `typography`, `layout`). */
  id: string;
  /**
   * Message key under `puck.chapters` — preferred over {@link title} for i18n.
   * Chapter `id` is structural only; do not use it as a translation key.
   */
  titleKey?: PuckChapterTitleKey;
  /** Chapter header title (English fallback when {@link titleKey} is omitted). */
  title: string;
  /** Optional 14px icon. */
  icon?: ReactNode;
  /** Categorized sub-fields; omit to use flat `fieldKeys`. */
  categories?: BlockFieldChapterCategory[];
  /** Flat sub-fields when no categories are defined. */
  fieldKeys?: string[];
  /** Per-field visibility inside this chapter (evaluated on chapter value). */
  visibleWhen?: Partial<Record<string, (groupValue: Record<string, unknown>) => boolean>>;
  /** When set, the whole chapter is hidden unless this returns true for flat block props. */
  visibleWhenFlat?: (flatProps: Record<string, unknown>) => boolean;
  /** Whether the chapter starts expanded in the sidebar. */
  defaultOpen?: boolean;
}

/** Per-block sidebar chapter layout. */
export interface BlockFieldChapterConfig {
  /** Keys kept at the top of the sidebar (arrays, slots, hidden editor fields). */
  topLevelFieldKeys?: string[];
  /** Collapsed chapters rendered below top-level fields. */
  chapters: BlockFieldChapter[];
}

/** Minimal Puck block shape accepted by {@link withFieldChapters}. */
export interface PuckBlockLike {
  label?: string;
  fields: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactNode;
  resolveFields?: (
    data: { props: Record<string, unknown> },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>;
  resolveData?: (
    data: { props: Record<string, unknown> },
    params: unknown,
  ) => Promise<{ props: Record<string, unknown> }> | { props: Record<string, unknown> };
}

/**
 * Collect every flat field key referenced by a chapter config.
 *
 * @param chapter - Chapter definition.
 * @returns All nested field keys.
 */
function chapterFieldKeys(chapter: BlockFieldChapter): string[] {
  if (chapter.categories?.length) {
    return chapter.categories.flatMap((cat) => cat.fieldKeys);
  }
  return chapter.fieldKeys ?? [];
}

/**
 * Collect every field key owned by chapters in a block config.
 *
 * @param config - Block chapter config.
 * @returns Deduped chapter-owned keys.
 */
export function getChapterOwnedKeys(config: BlockFieldChapterConfig): string[] {
  const keys = new Set<string>();
  for (const chapter of config.chapters) {
    for (const key of chapterFieldKeys(chapter)) {
      keys.add(key);
    }
  }
  return [...keys];
}

/**
 * Build category definitions for a chapter renderer from original Puck field defs.
 *
 * @param chapter - Chapter config.
 * @param originalFields - Source field map from the block.
 * @returns Category defs for {@link BlockFieldChapterGroup}.
 */
function buildCategoryDefs(
  chapter: BlockFieldChapter,
  originalFields: Record<string, unknown>,
): ChapterCategoryDef[] {
  const toFieldDef = (key: string): ChapterFieldDef => ({
    key,
    field: originalFields[key] as Record<string, unknown>,
    visible: chapter.visibleWhen?.[key],
  });

  if (chapter.categories?.length) {
    return chapter.categories.map((cat) => ({
      label: cat.label,
      fields: cat.fieldKeys.map(toFieldDef),
    }));
  }

  return [
    {
      fields: (chapter.fieldKeys ?? []).map(toFieldDef),
    },
  ];
}

/**
 * Puck custom-field renderer for one sidebar chapter (locale-aware title).
 *
 * @param props - Chapter config and Puck field bindings.
 * @returns Chapter UI or empty when hidden.
 */
function ChapterRenderer({
  chapter,
  categories,
  value,
  onChange,
  id,
}: {
  chapter: BlockFieldChapter;
  categories: ChapterCategoryDef[];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  id: string;
}) {
  const tChapters = useTranslations("puck.chapters");
  const flatProps = useNexusPuck(
    (state) => (state.selectedItem?.props ?? {}) as Record<string, unknown>,
  );

  if (chapter.visibleWhenFlat && !chapter.visibleWhenFlat(flatProps)) {
    return <></>;
  }

  const title = chapter.titleKey ? tChapters(chapter.titleKey) : chapter.title;

  return (
    <BlockFieldChapterGroup
      title={title}
      icon={chapter.icon}
      defaultOpen={chapter.defaultOpen}
      categories={categories}
      value={value ?? {}}
      onChange={onChange}
      id={id}
    />
  );
}

/**
 * Create a Puck custom-field renderer for one sidebar chapter.
 *
 * @param chapter - Chapter config.
 * @param originalFields - Source field map from the block.
 * @returns React render function for the custom field.
 */
function createChapterRenderer(
  chapter: BlockFieldChapter,
  originalFields: Record<string, unknown>,
): (props: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  id: string;
}) => React.ReactElement {
  const categories = buildCategoryDefs(chapter, originalFields);

  return function ChapterField({
    value,
    onChange,
    id,
  }: {
    value: Record<string, unknown>;
    onChange: (value: Record<string, unknown>) => void;
    id: string;
  }) {
    return (
      <ChapterRenderer
        chapter={chapter}
        categories={categories}
        value={value}
        onChange={onChange}
        id={id}
      />
    );
  };
}

/**
 * Nest flat default props under chapter keys for grouped sidebar storage.
 *
 * @param defaultProps - Original flat default props.
 * @param config - Block chapter config.
 * @returns Props with chapter-nested values.
 */
export function nestChapterDefaultProps(
  defaultProps: Record<string, unknown>,
  config: BlockFieldChapterConfig,
): Record<string, unknown> {
  const owned = new Set(getChapterOwnedKeys(config));
  const topLevel = new Set(config.topLevelFieldKeys ?? []);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(defaultProps)) {
    if (topLevel.has(key) || !owned.has(key)) {
      result[key] = value;
    }
  }

  for (const chapter of config.chapters) {
    const nested: Record<string, unknown> = {};
    for (const key of chapterFieldKeys(chapter)) {
      if (key in defaultProps) {
        nested[key] = defaultProps[key];
      }
    }
    result[chapter.id] = nested;
  }

  return result;
}

/**
 * Flatten nested chapter props back to flat keys for block render functions.
 *
 * Reads chapter objects first, then falls back to legacy flat props on the root.
 *
 * @param props - Raw Puck props (nested or flat).
 * @param config - Block chapter config.
 * @returns Flat props for block render.
 */
export function flattenChapterProps(
  props: Record<string, unknown>,
  config: BlockFieldChapterConfig,
): Record<string, unknown> {
  const result = { ...props };

  for (const chapter of config.chapters) {
    const nested = props[chapter.id] as Record<string, unknown> | undefined;
    for (const key of chapterFieldKeys(chapter)) {
      if (nested && key in nested) {
        result[key] = nested[key];
      }
    }
  }

  return result;
}

/**
 * Migrate flat legacy props into nested chapter objects for sidebar field binding.
 *
 * Render already falls back via {@link flattenChapterProps}; this ensures chapter
 * custom fields receive values from pre-migration flat storage.
 *
 * @param props - Raw Puck props (nested or flat).
 * @param config - Block chapter config.
 * @returns Props with chapter-nested values populated from flat fallbacks.
 */
export function ensureNestedChapterProps(
  props: Record<string, unknown>,
  config: BlockFieldChapterConfig,
): Record<string, unknown> {
  const result = { ...props };

  for (const chapter of config.chapters) {
    const existing = (result[chapter.id] as Record<string, unknown> | undefined) ?? {};
    const nested = { ...existing };
    let changed = false;

    for (const key of chapterFieldKeys(chapter)) {
      if (!(key in nested) && key in result) {
        nested[key] = result[key];
        changed = true;
      }
    }

    if (changed || !(chapter.id in result)) {
      result[chapter.id] = nested;
    }
  }

  return result;
}

/**
 * Remove chapter custom fields from the Puck sidebar when `visibleWhenFlat` hides them.
 *
 * Returning `null` from the chapter renderer still leaves an empty Puck `Field` row
 * (divider + padding). Omitting the field key prevents the shell from rendering.
 *
 * @param fields - Resolved Puck fields map for the selected item.
 * @param flatProps - Flat block props used for visibility checks.
 * @param config - Block chapter config.
 * @returns Fields map with hidden chapter keys removed.
 */
export function resolveChapterFieldVisibility(
  fields: Record<string, unknown>,
  flatProps: Record<string, unknown>,
  config: BlockFieldChapterConfig,
): Record<string, unknown> {
  const result = { ...fields };

  for (const chapter of config.chapters) {
    if (chapter.visibleWhenFlat && !chapter.visibleWhenFlat(flatProps)) {
      delete result[chapter.id];
    }
  }

  return result;
}

/**
 * Build the reordered Puck `fields` map: top-level keys first, then chapter custom fields.
 *
 * @param originalFields - Source field definitions from the block.
 * @param config - Block chapter config.
 * @returns Transformed fields map.
 */
function buildChapterFields(
  originalFields: Record<string, unknown>,
  config: BlockFieldChapterConfig,
): Record<string, unknown> {
  const owned = new Set(getChapterOwnedKeys(config));
  const topLevel = config.topLevelFieldKeys ?? [];
  const result: Record<string, unknown> = {};

  for (const key of topLevel) {
    if (key in originalFields) {
      result[key] = originalFields[key];
    }
  }

  for (const [key, field] of Object.entries(originalFields)) {
    if (!owned.has(key) && !(key in result)) {
      result[key] = field;
    }
  }

  for (const chapter of config.chapters) {
    result[chapter.id] = {
      type: "custom",
      label: "",
      render: createChapterRenderer(chapter, originalFields) as never,
    };
  }

  return result;
}

/**
 * Wrap a Puck block with collapsible sidebar field chapters.
 *
 * @param block - Original block export.
 * @param config - Chapter layout for this block type.
 * @returns Block config with grouped sidebar fields and flattened render props.
 */
export function withFieldChapters<T extends PuckBlockLike>(
  block: T,
  config: BlockFieldChapterConfig | undefined,
): T {
  if (!config) return block;

  const originalFields = block.fields;
  const originalRender = block.render;
  const originalResolveFields = block.resolveFields;
  const originalResolveData = block.resolveData;

  return {
    ...block,
    fields: buildChapterFields(originalFields, config),
    defaultProps: nestChapterDefaultProps(block.defaultProps, config),
    resolveFields: (data, params) => {
      const migratedProps = ensureNestedChapterProps(
        data.props as Record<string, unknown>,
        config,
      );
      const flatProps = flattenChapterProps(migratedProps, config);
      const flatData = {
        ...data,
        props: flatProps,
      };
      const base = originalResolveFields
        ? originalResolveFields(flatData, params)
        : params.fields;
      return resolveChapterFieldVisibility(base, flatProps, config);
    },
    resolveData: async (data, params) => {
      let props = ensureNestedChapterProps(data.props as Record<string, unknown>, config);

      if (originalResolveData) {
        const resolved = await originalResolveData(
          { ...data, props: flattenChapterProps(props, config) },
          params,
        );
        props = resolved.props as Record<string, unknown>;
      }

      return { props: ensureNestedChapterProps(props, config) };
    },
    render: (props) =>
      originalRender(
        flattenChapterProps(
          ensureNestedChapterProps(props as Record<string, unknown>, config),
          config,
        ),
      ),
  };
}
