/**
 * @fileoverview Hierarchy tier list for the user access settings editor.
 *
 * @module src/components/access-control/AccessHierarchyPanel
 */

import type { AccessLevelDefinition } from "@shared/constants/accessControl";

/** Props for {@link AccessHierarchyPanel}. */
export interface AccessHierarchyPanelProps {
  levels: AccessLevelDefinition[];
  onChange: (levels: AccessLevelDefinition[]) => void;
}

/**
 * Editable hierarchy tier descriptions (index and key are read-only).
 *
 * @param props - Level definitions and change handler.
 * @returns Hierarchy panel JSX.
 */
export function AccessHierarchyPanel({ levels, onChange }: AccessHierarchyPanelProps) {
  const sorted = [...levels].sort((a, b) => a.index - b.index);

  return (
    <div className="global-layout-editor__stack">
      <p className="text-sm text-(--color-text-secondary)">
        Seven tiers ordered by authority. Index <strong>0</strong> is highest. Lower indices
        outrank higher indices when administering roles and permissions.
      </p>
      <div className="global-layout-editor__stack">
        {sorted.map((level) => (
          <div
            key={level.key}
            className="glass-panel rounded-[var(--radius-md)] border border-zinc-700/20 p-4 dark:border-zinc-300/10"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="badge badge-group">Index {level.index}</span>
              <span className="text-xs text-(--color-text-secondary)">{level.key}</span>
            </div>
            <label className="mb-1 block text-xs font-medium text-(--color-text-primary)">
              Label
            </label>
            <input
              className="global-layout-editor__category-label-input mb-3 w-full text-sm"
              value={level.label}
              onChange={(e) => {
                onChange(
                  levels.map((row) =>
                    row.index === level.index ? { ...row, label: e.target.value } : row,
                  ),
                );
              }}
            />
            <label className="mb-1 block text-xs font-medium text-(--color-text-primary)">
              Description
            </label>
            <textarea
              className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-text-primary)"
              rows={2}
              value={level.description}
              onChange={(e) => {
                onChange(
                  levels.map((row) =>
                    row.index === level.index ? { ...row, description: e.target.value } : row,
                  ),
                );
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccessHierarchyPanel;
