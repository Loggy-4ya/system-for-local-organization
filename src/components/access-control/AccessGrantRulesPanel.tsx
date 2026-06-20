/**
 * @fileoverview Grant-rules editor — assignable levels and delegatable permissions.
 *
 * @module src/components/access-control/AccessGrantRulesPanel
 */

import {
  ALL_PERMISSION_KEYS,
  PERMISSION_LABELS,
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";

/** Props for {@link AccessGrantRulesPanel}. */
export interface AccessGrantRulesPanelProps {
  levels: AccessControlSettingsConfig["levels"];
  grantRules: AccessControlSettingsConfig["grantRules"];
  onChange: (grantRules: AccessControlSettingsConfig["grantRules"]) => void;
}

/**
 * Per-tier downward assignment and delegation rule editor.
 *
 * @param props - Grant rules and change handler.
 * @returns Grant rules panel JSX.
 */
export function AccessGrantRulesPanel({ levels, grantRules, onChange }: AccessGrantRulesPanelProps) {
  const sortedLevels = [...levels].sort((a, b) => a.index - b.index);

  /**
   * Toggle an assignable level index for a tier.
   *
   * @param actorIndex - Acting tier index.
   * @param targetIndex - Target tier index.
   * @param enabled - Whether assignment is allowed.
   */
  function toggleAssignableLevel(
    actorIndex: AccessLevelIndex,
    targetIndex: AccessLevelIndex,
    enabled: boolean,
  ) {
    const rule = grantRules[actorIndex];
    const current = rule?.assignableLevelIndices ?? [];
    const next = enabled
      ? [...new Set([...current, targetIndex])].sort((a, b) => a - b)
      : current.filter((idx) => idx !== targetIndex);

    onChange({
      ...grantRules,
      [actorIndex]: {
        ...rule,
        assignableLevelIndices: next,
        delegatablePermissions: rule?.delegatablePermissions ?? [],
      },
    });
  }

  /**
   * Toggle a delegatable permission for a tier.
   *
   * @param actorIndex - Acting tier index.
   * @param permission - Permission key.
   * @param enabled - Whether delegation is allowed.
   */
  function toggleDelegatablePermission(
    actorIndex: AccessLevelIndex,
    permission: PermissionKey,
    enabled: boolean,
  ) {
    const rule = grantRules[actorIndex];
    const current = rule?.delegatablePermissions ?? [];
    const next = enabled
      ? [...new Set([...current, permission])]
      : current.filter((key) => key !== permission);

    onChange({
      ...grantRules,
      [actorIndex]: {
        assignableLevelIndices: rule?.assignableLevelIndices ?? [],
        delegatablePermissions: next,
      },
    });
  }

  return (
    <div className="global-layout-editor__stack">
      <p className="text-sm text-(--color-text-secondary)">
        Each tier may only assign levels strictly below its own index and delegate permissions it
        holds through the grant rule. Role administration requires both hierarchy rank and the
        relevant permission.
      </p>
      {sortedLevels.map((level) => {
        const actorIndex = level.index as AccessLevelIndex;
        const rule = grantRules[actorIndex];
        const lowerTiers = sortedLevels.filter((row) => row.index > level.index);

        return (
          <div
            key={level.key}
            className="glass-panel rounded-[var(--radius-md)] border border-zinc-700/20 p-4 dark:border-zinc-300/10"
          >
            <h3 className="text-sm font-semibold text-(--color-text-primary)">
              Index {level.index} — {level.label}
            </h3>

            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-(--color-text-primary)">
                May assign these levels to users
              </p>
              {lowerTiers.length === 0 ? (
                <p className="text-xs text-(--color-text-secondary)">No lower tiers available.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {lowerTiers.map((target) => {
                    const targetIndex = target.index as AccessLevelIndex;
                    const checked = rule?.assignableLevelIndices.includes(targetIndex) ?? false;
                    return (
                      <label
                        key={target.key}
                        className="inline-flex items-center gap-1.5 text-xs text-(--color-text-secondary)"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleAssignableLevel(actorIndex, targetIndex, e.target.checked)
                          }
                        />
                        {target.index} · {target.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-(--color-text-primary)">
                May delegate these permissions downward
              </p>
              <div className="flex flex-col gap-1.5">
                {ALL_PERMISSION_KEYS.map((permission) => {
                  const checked = rule?.delegatablePermissions.includes(permission) ?? false;
                  return (
                    <label
                      key={permission}
                      className="inline-flex items-center gap-2 text-xs text-(--color-text-secondary)"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          toggleDelegatablePermission(actorIndex, permission, e.target.checked)
                        }
                      />
                      {PERMISSION_LABELS[permission]}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AccessGrantRulesPanel;
