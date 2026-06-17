"use client";

/**
 * @fileoverview Editor panel for signed-in avatar dropdown links (User Menu chapter).
 *
 * @module src/components/global-layout/HeaderUserMenuEditor
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { LucideIconPicker } from "./LucideIconPicker";
import { HeaderNavFlagToggles } from "./HeaderNavFlagToggles";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { EditorSectionHeader } from "./EditorSectionHeader";
import { useEditorSortableList } from "./useEditorSortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type HeaderNavItem,
  type AllowedLucideIcon,
} from "@shared/constants/globalLayout";

/** Props for {@link HeaderUserMenuEditor}. */
export interface HeaderUserMenuEditorProps {
  /** Current user menu links. */
  items: HeaderNavItem[];
  /** Replace the full user menu list. */
  onChange: (items: HeaderNavItem[]) => void;
}

/** Inline classes for label input reflecting link flags. */
function userMenuLabelInputClass(item: HeaderNavItem): string {
  return cn(
    "global-layout-editor__nav-label-input text-xs min-w-0 w-full",
    item.variant === "button" && "global-layout-editor__nav-label-input--button",
    item.adminOnly && "global-layout-editor__nav-label-input--admin",
  );
}

/**
 * Configure links shown in the signed-in avatar dropdown (desktop) and mobile account section.
 *
 * @param props - See {@link HeaderUserMenuEditorProps}.
 * @returns User menu editor JSX.
 */
export function HeaderUserMenuEditor({ items, onChange }: HeaderUserMenuEditorProps) {
  const sortable = useEditorSortableList({
    items,
    onReorder: onChange,
  });

  const addItem = () => {
    const newItem: HeaderNavItem = {
      id: `user-menu-${Date.now()}`,
      href: "/profile",
      label: "New Link",
      variant: "link",
    };
    onChange([...items, newItem]);
  };

  const deleteItem = (itemId: string) => {
    onChange(items.filter((item) => item.id !== itemId));
  };

  const updateItem = (itemId: string, fields: Partial<HeaderNavItem>) => {
    onChange(items.map((item) => (item.id === itemId ? { ...item, ...fields } : item)));
  };

  return (
    <div className="nexus-field-category global-layout-editor__stack">
      <EditorSectionHeader
        label="Signed-in user links"
        action={
          <Button type="button" className="global-layout-editor__btn-text" onClick={addItem}>
            <Plus size={12} />
            Add Link
          </Button>
        }
      />
      <p className="global-layout-editor__field-hint global-layout-editor__user-menu-hint">
        Shown when a user is signed in — desktop avatar dropdown and mobile sidebar account menu (chevron on user badge).
        Log out is always appended automatically.
      </p>
      {items.length === 0 ? (
        <div className="global-layout-editor__empty">
          No user menu links yet. Add Profile, Settings, or other account pages.
        </div>
      ) : (
        <div className="global-layout-editor__stack global-layout-editor__user-menu-link-list">
          <div className="global-layout-editor__grid-labels global-layout-editor__user-menu-grid-labels">
            <span />
            <span>Icon</span>
            <span>Label</span>
            <span>URL</span>
            <span>Flags</span>
            <span />
          </div>
          {items.map((item, itemIndex) => (
            <React.Fragment key={item.id}>
              <EditorDropSlot active={sortable.shouldShowDropSlotBefore(itemIndex)} />
              <div
                ref={(node) => sortable.registerRowRef(itemIndex, node)}
                className={sortable.getRowClassName(
                  itemIndex,
                  "global-layout-editor__item-row global-layout-editor__nav-item-row",
                )}
              >
                <div className="global-layout-editor__nav-item-head">
                  <EditorDragHandle {...sortable.getHandleProps(itemIndex)} />
                  <Button
                    type="button"
                    variant="destructive"
                    className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--mobile global-layout-editor__btn-icon sm:hidden"
                    onClick={() => deleteItem(item.id)}
                    aria-label={`Delete ${item.label}`}
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
                    onChange={(icon) =>
                      updateItem(item.id, { icon: icon ? (icon as AllowedLucideIcon) : undefined })
                    }
                  />
                </div>

                <label className="global-layout-editor__nav-field">
                  <span className="global-layout-editor__nav-field-label">Label</span>
                  <Input
                    type="text"
                    value={item.label}
                    onChange={(event) => updateItem(item.id, { label: event.target.value })}
                    placeholder="Label"
                    className={userMenuLabelInputClass(item)}
                  />
                </label>

                <label className="global-layout-editor__nav-field">
                  <span className="global-layout-editor__nav-field-label">URL</span>
                  <Input
                    type="text"
                    value={item.href}
                    onChange={(event) => updateItem(item.id, { href: event.target.value })}
                    placeholder="/profile"
                    className="text-xs min-w-0 w-full"
                  />
                </label>

                <div className="global-layout-editor__nav-item-flags">
                  <span className="global-layout-editor__nav-field-label">Flags</span>
                  <div className="global-layout-editor__nav-item-flag-group">
                    <HeaderNavFlagToggles
                      value={item}
                      onChange={(fields) => updateItem(item.id, fields)}
                    />
                  </div>
                </div>

                <div className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--desktop hidden sm:flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    className="global-layout-editor__btn-icon"
                    onClick={() => deleteItem(item.id)}
                    aria-label={`Delete ${item.label}`}
                    data-tooltip="Delete link"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <EditorDropSlot active={sortable.shouldShowDropSlotAfter(itemIndex)} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default HeaderUserMenuEditor;
