"use client";

/**
 * @fileoverview Generic collapsible Puck sidebar chapter that renders nested sub-fields via AutoField.
 *
 * @module src/components/puck/fields/BlockFieldChapterGroup
 */

import { AutoField } from "@puckeditor/core";
import type { ReactNode } from "react";
import { isBinaryToggleField } from "../lib/binaryToggleFields";
import { FieldChapter } from "./FieldChapter";

/** One sub-field inside a chapter category. */
export interface ChapterFieldDef {
  /** Prop key stored on the chapter object. */
  key: string;
  /** Puck field definition (label, type, options, render, …). */
  field: Record<string, unknown>;
  /** When set, sub-field is shown only when this returns true for the chapter value. */
  visible?: (groupValue: Record<string, unknown>) => boolean;
}

/** Labeled section inside a chapter body. */
export interface ChapterCategoryDef {
  /** Optional uppercase category label (Padding, Typography, …). */
  label?: string;
  /** Sub-fields rendered in this section. */
  fields: ChapterFieldDef[];
}

/** Props for {@link BlockFieldChapterGroup}. */
export interface BlockFieldChapterGroupProps {
  /** Chapter title in the sidebar header. */
  title: string;
  /** Optional 14px icon node. */
  icon?: ReactNode;
  /** Whether the chapter starts expanded. */
  defaultOpen?: boolean;
  /** Categorized sub-fields. */
  categories: ChapterCategoryDef[];
  /** Nested chapter prop value from Puck. */
  value: Record<string, unknown>;
  /** Patch handler for the whole chapter object. */
  onChange: (value: Record<string, unknown>) => void;
  /** Stable id prefix for AutoField instances. */
  id: string;
}

/**
 * Render one collapsible sidebar chapter with uniform `.nexus-sidebar-field` spacing.
 *
 * @param props - See {@link BlockFieldChapterGroupProps}.
 * @returns Collapsible field chapter UI.
 */
export function BlockFieldChapterGroup({
  title,
  icon,
  defaultOpen,
  categories,
  value,
  onChange,
  id,
}: BlockFieldChapterGroupProps) {
  const group = value ?? {};

  const patch = (key: string, next: unknown) => {
    if (group[key] === next) return;
    onChange({ ...group, [key]: next });
  };

  return (
    <FieldChapter title={title} icon={icon} defaultOpen={defaultOpen}>
      {categories.map((cat, catIndex) => (
        <div key={cat.label ?? `cat-${catIndex}`} className="nexus-field-category">
          {cat.label ? <span className="nexus-field-category__label">{cat.label}</span> : null}
          {cat.fields.map(({ key, field, visible }) => {
            if (visible && !visible(group)) return null;
            if (!field) return null;
            const fieldDef = field as {
              label?: string;
              type?: string;
              options?: Array<{ label: string; value: string | number | boolean | null | undefined }>;
            };
            const isBinaryToggle =
              fieldDef.type === "radio" &&
              isBinaryToggleField(fieldDef.options);
            const showLabel =
              Boolean(fieldDef.label) && fieldDef.type !== "custom" && !isBinaryToggle;
            return (
              <div key={key} className="nexus-sidebar-field">
                {showLabel ? (
                  <span className="nexus-field-subfield__label">{fieldDef.label}</span>
                ) : null}
                <AutoField
                  field={field as never}
                  value={group[key]}
                  onChange={(next) => patch(key, next)}
                  id={`${id}-${key}`}
                />
              </div>
            );
          })}
        </div>
      ))}
    </FieldChapter>
  );
}

export default BlockFieldChapterGroup;
