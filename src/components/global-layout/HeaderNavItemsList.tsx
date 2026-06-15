"use client";

/**
 * @fileoverview Sortable nav item rows for one header category in the Global Layout Editor.
 *
 * @module src/components/global-layout/HeaderNavItemsList
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { LucideIconPicker } from "./LucideIconPicker";
import { HeaderNavFlagToggles } from "./HeaderNavFlagToggles";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { useHeaderNavItemSortable } from "./HeaderNavItemSortableContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type HeaderNavItem } from "@shared/constants/globalLayout";

/** Props for {@link HeaderNavItemsList}. */
export interface HeaderNavItemsListProps {
  /** Parent category id used for cross-category drag targets. */
  categoryId: string;
  /** Nav items in display order. */
  items: HeaderNavItem[];
  /** Update one item's fields. */
  onUpdateItem: (itemId: string, fields: Partial<HeaderNavItem>) => void;
  /** Remove one item. */
  onDeleteItem: (itemId: string) => void;
}

/** Inline classes for label input reflecting link flags (replaces summary badges). */
function navItemLabelInputClass(item: HeaderNavItem): string {
  return cn(
    "global-layout-editor__nav-label-input text-xs min-w-0 w-full",
    item.variant === "button" && "global-layout-editor__nav-label-input--button",
    item.adminOnly && "global-layout-editor__nav-label-input--admin",
  );
}

/**
 * Drag-reorderable grid of header navigation link rows.
 *
 * @param props - See {@link HeaderNavItemsListProps}.
 * @returns Nav item list JSX.
 */
export function HeaderNavItemsList({
  categoryId,
  items,
  onUpdateItem,
  onDeleteItem,
}: HeaderNavItemsListProps) {
  const sortable = useHeaderNavItemSortable();

  if (items.length === 0) {
    return (
      <div className="global-layout-editor__empty py-8">
        No links in this category. Drop a link here from another category.
      </div>
    );
  }

  return (
    <div className="global-layout-editor__stack">
      <div className="global-layout-editor__grid-labels">
        <span />
        <span>Icon</span>
        <span>Label</span>
        <span>URL</span>
        <span>Flags</span>
        <span />
      </div>
      {items.map((item, itemIndex) => (
        <React.Fragment key={item.id}>
          <EditorDropSlot active={sortable.shouldShowDropSlotBefore(categoryId, itemIndex)} />
          <div
            ref={(node) => sortable.registerNavRow(categoryId, itemIndex, node)}
            className={sortable.getNavRowClassName(
              categoryId,
              itemIndex,
              "global-layout-editor__item-row global-layout-editor__nav-item-row",
            )}
          >
            <div className="global-layout-editor__nav-item-head">
              <EditorDragHandle {...sortable.getNavHandleProps(categoryId, itemIndex)} />
              <Button
                type="button"
                variant="destructive"
                className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--mobile global-layout-editor__btn-icon sm:hidden"
                onClick={() => onDeleteItem(item.id)}
                aria-label="Delete link"
                data-tooltip="Delete link"
              >
                <Trash2 size={14} />
              </Button>
            </div>

            <div className="global-layout-editor__nav-item-icon">
              <span className="global-layout-editor__nav-field-label">Icon</span>
              <LucideIconPicker
                tooltip="Link icon"
                value={item.icon}
                onChange={(icon) => onUpdateItem(item.id, { icon: icon || undefined })}
              />
            </div>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">Label</span>
              <Input
                type="text"
                value={item.label}
                onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
                placeholder="Label"
                className={navItemLabelInputClass(item)}
              />
            </label>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">URL</span>
              <Input
                type="text"
                value={item.href}
                onChange={(e) => onUpdateItem(item.id, { href: e.target.value })}
                placeholder="/news"
                className="text-xs min-w-0 w-full"
              />
            </label>

            <div className="global-layout-editor__nav-item-flags">
              <span className="global-layout-editor__nav-field-label">Flags</span>
              <div className="global-layout-editor__nav-item-flag-group">
                <HeaderNavFlagToggles
                  value={item}
                  onChange={(fields) => onUpdateItem(item.id, fields)}
                />
              </div>
            </div>

            <div className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--desktop hidden sm:flex justify-end">
              <Button
                type="button"
                variant="destructive"
                className="global-layout-editor__btn-icon"
                onClick={() => onDeleteItem(item.id)}
                aria-label="Delete link"
                data-tooltip="Delete link"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
          <EditorDropSlot
            active={sortable.shouldShowDropSlotAfter(categoryId, itemIndex, items.length)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export default HeaderNavItemsList;
