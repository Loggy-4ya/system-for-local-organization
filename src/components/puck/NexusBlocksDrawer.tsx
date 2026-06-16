"use client";

/**
 * @fileoverview Blocks drawer — FieldChapter accordions with Puck drag items.
 *
 * Replaces Puck `ComponentList` so category expand/collapse uses the same grid
 * accordion as Fields (`FieldChapter` + `puck-editor.css`).
 *
 * @module src/components/puck/NexusBlocksDrawer
 */

import { Drawer } from "@puckeditor/core";
import { useMemo } from "react";
import { FieldChapter } from "@/components/puck/fields/FieldChapter";
import { CATEGORY_ICONS, puckIcon } from "@/components/puck/lib/puckIcons";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { PUCK_EDITOR_OVERRIDES } from "@/components/puck/puckEditorOverrides";

/**
 * One draggable block row inside a category chapter.
 *
 * @param props - Component type name.
 * @returns Puck drawer item wired to overrides.
 */
function NexusBlocksDrawerItem({ name }: { name: string }) {
  const canInsert = useNexusPuck(
    (state) => state.getPermissions({ type: name }).insert,
  );

  return (
    <Drawer.Item
      name={name}
      isDragDisabled={!canInsert}
      children={PUCK_EDITOR_OVERRIDES.drawerItem}
    />
  );
}

/**
 * Blocks plugin body — categorized drawer with FieldChapter motion.
 *
 * @returns Blocks drawer JSX.
 */
export function NexusBlocksDrawer() {
  const config = useNexusPuck((state) => state.config);
  const uiComponentList = useNexusPuck((state) => state.appState.ui.componentList);

  const categories = useMemo(() => {
    const entries = Object.entries(uiComponentList);
    if (entries.length === 0) {
      return [];
    }

    const matched = new Set<string>();
    const rendered: Array<{
      id: string;
      title: string;
      defaultOpen: boolean;
      components: string[];
    }> = [];

    for (const [categoryKey, category] of entries) {
      if (!category?.components || category.visible === false) {
        continue;
      }

      category.components.forEach((componentName) => matched.add(componentName));
      rendered.push({
        id: categoryKey,
        title: category.title || categoryKey,
        defaultOpen: category.expanded ?? false,
        components: category.components,
      });
    }

    const remaining = Object.keys(config.components).filter((name) => !matched.has(name));
    const other = uiComponentList.other;
    if (
      remaining.length > 0 &&
      other?.visible !== false &&
      !other?.components
    ) {
      rendered.push({
        id: "other",
        title: other?.title || "Other",
        defaultOpen: other?.expanded ?? false,
        components: remaining,
      });
    }

    return rendered;
  }, [config.components, uiComponentList]);

  return (
    <div className="nexus-blocks-drawer">
      {categories.map((category) => {
        const CategoryIcon = CATEGORY_ICONS[category.id];
        return (
          <FieldChapter
            key={category.id}
            title={category.title}
            icon={CategoryIcon ? puckIcon(CategoryIcon) : undefined}
            defaultOpen={category.defaultOpen}
          >
            <Drawer>
              {category.components.map((componentName) => (
                <NexusBlocksDrawerItem key={componentName} name={componentName} />
              ))}
            </Drawer>
          </FieldChapter>
        );
      })}
    </div>
  );
}

export default NexusBlocksDrawer;
