"use client";

/**
 * @fileoverview Header configuration editor panel.
 *
 * Imbued with beautiful, modern glassmorphic UI/UX styling, fully integrated with
 * the project's light/dark design tokens and matching Puck's collapsible sidebar layout.
 *
 * @module src/components/global-layout/HeaderChromeEditor
 */

import React from "react";
import { Plus, Trash2, Sliders, FolderPlus } from "lucide-react";
import { LucideIconPicker } from "./LucideIconPicker";
import { HeaderNavFlagToggles } from "./HeaderNavFlagToggles";
import { HeaderNavItemsList } from "./HeaderNavItemsList";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { EditorCollapsibleIsland } from "./EditorCollapsibleIsland";
import { HeaderNavItemSortableProvider, useHeaderNavItemSortable } from "./HeaderNavItemSortableContext";
import { useEditorSortableList } from "./useEditorSortableList";
import { EditorOptionBadgeGroup } from "./EditorOptionBadgeGroup";
import { EditorField } from "./EditorField";
import { EditorSectionHeader } from "./EditorSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldChapter } from "@/components/puck/fields/FieldChapter";
import { puckIcon } from "@/components/puck/lib/puckIcons";
import { cn } from "@/lib/utils";
import {
  type HeaderConfig,
  type HeaderCategory,
  type HeaderNavItem,
  type AllowedLucideIcon,
  type HeaderNavAlign,
} from "@shared/constants/globalLayout";

interface HeaderChromeEditorProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
}

export function HeaderChromeEditor({ config, onChange }: HeaderChromeEditorProps) {
  const updateLayout = (key: keyof HeaderConfig["layout"], value: string) => {
    onChange({
      ...config,
      layout: {
        ...config.layout,
        [key]: value,
      },
    });
  };

  const addCategory = () => {
    const newId = `cat-${Date.now()}`;
    const newCategory: HeaderCategory = {
      id: newId,
      label: "New Category",
      items: [],
    };
    onChange({
      ...config,
      categories: [...config.categories, newCategory],
    });
  };

  const deleteCategory = (catId: string) => {
    onChange({
      ...config,
      categories: config.categories.filter((c) => c.id !== catId),
    });
  };

  const reorderCategories = (categories: HeaderCategory[]) => {
    onChange({ ...config, categories });
  };

  const categorySortable = useEditorSortableList({
    items: config.categories,
    onReorder: reorderCategories,
  });

  const updateCategoryLabel = (catId: string, label: string) => {
    onChange({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId ? { ...c, label: label || undefined } : c
      ),
    });
  };

  const updateCategoryIcon = (catId: string, icon: string | undefined) => {
    onChange({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId
          ? { ...c, icon: icon ? (icon as AllowedLucideIcon) : undefined }
          : c
      ),
    });
  };

  const updateCategoryFields = (catId: string, fields: Partial<HeaderCategory>) => {
    onChange({
      ...config,
      categories: config.categories.map((c) => (c.id === catId ? { ...c, ...fields } : c)),
    });
  };

  const addNavItem = (catId: string) => {
    const newItem: HeaderNavItem = {
      id: `item-${Date.now()}`,
      href: "/",
      label: "New Link",
      variant: "link",
    };

    onChange({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, newItem] } : c
      ),
    });
  };

  const deleteNavItem = (catId: string, itemId: string) => {
    onChange({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      ),
    });
  };

  const updateNavItem = (catId: string, itemId: string, fields: Partial<HeaderNavItem>) => {
    onChange({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map((i) => (i.id === itemId ? { ...i, ...fields } : i)),
            }
          : c
      ),
    });
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Layout Settings Chapter */}
      <FieldChapter title="Header Layout" icon={puckIcon(Sliders)} defaultOpen={true}>
        <div className="global-layout-editor__layout-grid">
          <EditorField
            label="Spacing Gap"
            hint="Horizontal padding between navigation groups."
          >
            <EditorOptionBadgeGroup
              ariaLabel="Header spacing gap"
              value={config.layout.gap}
              onChange={(val) => updateLayout("gap", val)}
              options={[
                { label: "8px", value: "sm", title: "Small (8px)", activeVariant: "default" },
                { label: "16px", value: "md", title: "Medium (16px)", activeVariant: "default" },
                { label: "24px", value: "lg", title: "Large (24px)", activeVariant: "default" },
                { label: "36px", value: "xl", title: "Extra large (36px)", activeVariant: "default" },
                { label: "48px", value: "2xl", title: "2× large (48px)", activeVariant: "default" },
              ]}
            />
          </EditorField>

          <EditorField
            label="Default Alignment"
            hint="Fallback desktop zone for categories without their own alignment."
          >
            <EditorOptionBadgeGroup
              ariaLabel="Header default alignment"
              value={config.layout.align}
              onChange={(val) => updateLayout("align", val)}
              options={[
                { label: "Left", value: "start", title: "Left zone", activeVariant: "default" },
                { label: "Center", value: "center", title: "Center zone", activeVariant: "default" },
                { label: "Right", value: "end", title: "Right zone", activeVariant: "default" },
              ]}
            />
          </EditorField>
        </div>
      </FieldChapter>

      {/* Categories & Items Chapter */}
      <FieldChapter title="Navigation Categories" icon={puckIcon(FolderPlus)} defaultOpen={true}>
        <div className="nexus-field-category global-layout-editor__stack">
          <EditorSectionHeader
            label="Configure Categories"
            action={
              <Button type="button" className="global-layout-editor__btn-text" onClick={addCategory}>
                <Plus size={12} />
                Add Category
              </Button>
            }
          />

          {config.categories.length === 0 ? (
            <div className="global-layout-editor__empty">
              No categories defined. Click &ldquo;Add Category&rdquo; to start.
            </div>
          ) : (
            <HeaderNavItemSortableProvider
              categories={config.categories}
              onCategoriesChange={(categories) => onChange({ ...config, categories })}
            >
              <div className="global-layout-editor__stack">
                {config.categories.map((category, catIndex) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    catIndex={catIndex}
                    categoryCount={config.categories.length}
                    categorySortable={categorySortable}
                    onUpdateCategoryLabel={updateCategoryLabel}
                    onUpdateCategoryIcon={updateCategoryIcon}
                    onUpdateCategoryFields={updateCategoryFields}
                    onAddNavItem={addNavItem}
                    onDeleteCategory={deleteCategory}
                    onUpdateNavItem={updateNavItem}
                    onDeleteNavItem={deleteNavItem}
                  />
                ))}
              </div>
            </HeaderNavItemSortableProvider>
          )}
        </div>
      </FieldChapter>
    </div>
  );
}

/** Category card sortable helpers from {@link useEditorSortableList}. */
interface CategorySortableApi {
  registerRowRef: (index: number, node: HTMLElement | null) => void;
  getHandleProps: (index: number) => { onPointerDown: (event: React.PointerEvent<HTMLElement>) => void };
  getRowClassName: (index: number, baseClassName: string) => string;
  shouldShowDropSlotBefore: (index: number) => boolean;
  shouldShowDropSlotAfter: (index: number) => boolean;
}

/** Props for one configurable header category card. */
interface CategoryCardProps {
  category: HeaderCategory;
  catIndex: number;
  categoryCount: number;
  categorySortable: CategorySortableApi;
  onUpdateCategoryLabel: (catId: string, label: string) => void;
  onUpdateCategoryIcon: (catId: string, icon: string | undefined) => void;
  onUpdateCategoryFields: (catId: string, fields: Partial<HeaderCategory>) => void;
  onAddNavItem: (catId: string) => void;
  onDeleteCategory: (catId: string) => void;
  onUpdateNavItem: (catId: string, itemId: string, fields: Partial<HeaderNavItem>) => void;
  onDeleteNavItem: (catId: string, itemId: string) => void;
}

/** Inline classes for category label input reflecting category flags. */
function categoryLabelInputClass(category: HeaderCategory): string {
  return cn(
    "global-layout-editor__category-label-input global-layout-editor__nav-label-input text-xs font-medium",
    category.variant === "button" && "global-layout-editor__nav-label-input--button",
    category.adminOnly && "global-layout-editor__nav-label-input--admin",
  );
}

/**
 * One header category shell with drag-reorderable nav items.
 *
 * @param props - Category card props.
 * @returns Category card JSX.
 */
function CategoryCard({
  category,
  catIndex,
  categoryCount,
  categorySortable,
  onUpdateCategoryLabel,
  onUpdateCategoryIcon,
  onUpdateCategoryFields,
  onAddNavItem,
  onDeleteCategory,
  onUpdateNavItem,
  onDeleteNavItem,
}: CategoryCardProps) {
  const navSortable = useHeaderNavItemSortable();
  const linkCountLabel = `${category.items.length} link${category.items.length === 1 ? "" : "s"}`;

  return (
    <>
      <EditorDropSlot active={categorySortable.shouldShowDropSlotBefore(catIndex)} />
      <EditorCollapsibleIsland
        outerRef={(node) => {
          categorySortable.registerRowRef(catIndex, node);
          navSortable.registerCategoryListZone(category.id, category.items.length, node);
        }}
        className={navSortable.getCategoryClassName(
          category.id,
          categorySortable.getRowClassName(catIndex, ""),
        )}
        summary={linkCountLabel}
        header={
          <div className="global-layout-editor__category-head">
            <EditorDragHandle {...categorySortable.getHandleProps(catIndex)} />
            <span className="global-layout-editor__category-head-icon">
              <LucideIconPicker
                tooltip="Category icon"
                value={category.icon}
                onChange={(icon) => onUpdateCategoryIcon(category.id, icon || undefined)}
              />
            </span>
            <Input
              type="text"
              value={category.label || ""}
              onChange={(e) => onUpdateCategoryLabel(category.id, e.target.value)}
              placeholder="Category label"
              className={categoryLabelInputClass(category)}
            />
            <div className="global-layout-editor__category-head-flags">
              <HeaderNavFlagToggles
                value={category}
                onChange={(fields) => onUpdateCategoryFields(category.id, fields)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="global-layout-editor__btn-text global-layout-editor__category-add-btn"
              onClick={() => onAddNavItem(category.id)}
            >
              <Plus size={12} />
              <span className="global-layout-editor__action-label">Add Link</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="global-layout-editor__btn-icon global-layout-editor__category-delete-btn"
              onClick={() => onDeleteCategory(category.id)}
              aria-label="Delete category"
              data-tooltip="Delete category"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        }
      >
        <EditorField
          label="Desktop Alignment"
          hint="Place this category in the left, center, or right nav zone. Default uses the layout setting above."
          className="global-layout-editor__field--category-align"
        >
          <EditorOptionBadgeGroup
            ariaLabel={`Alignment for ${category.label || category.id}`}
            value={category.align ?? "inherit"}
            onChange={(val) =>
              onUpdateCategoryFields(category.id, {
                align: val === "inherit" ? undefined : (val as HeaderNavAlign),
              })
            }
            options={[
              { label: "Default", value: "inherit", title: "Use layout default", activeVariant: "secondary" },
              { label: "Left", value: "start", title: "Left zone", activeVariant: "default" },
              { label: "Center", value: "center", title: "Center zone", activeVariant: "default" },
              { label: "Right", value: "end", title: "Right zone", activeVariant: "default" },
            ]}
          />
        </EditorField>
        <HeaderNavItemsList
          categoryId={category.id}
          items={category.items}
          onUpdateItem={(itemId, fields) => onUpdateNavItem(category.id, itemId, fields)}
          onDeleteItem={(itemId) => onDeleteNavItem(category.id, itemId)}
        />
      </EditorCollapsibleIsland>
      <EditorDropSlot
        active={
          catIndex === categoryCount - 1 && categorySortable.shouldShowDropSlotAfter(catIndex)
        }
      />
    </>
  );
}
