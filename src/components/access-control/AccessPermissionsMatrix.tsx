/**
 * @fileoverview Permission matrix editor for access-control settings.
 *
 * @module src/components/access-control/AccessPermissionsMatrix
 */

import {
  ALL_PERMISSION_KEYS,
  PERMISSION_LABELS,
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";

/** Props for {@link AccessPermissionsMatrix}. */
export interface AccessPermissionsMatrixProps {
  levels: AccessControlSettingsConfig["levels"];
  levelPermissions: AccessControlSettingsConfig["levelPermissions"];
  onChange: (levelPermissions: AccessControlSettingsConfig["levelPermissions"]) => void;
}

/**
 * Checkbox grid — rows are permissions, grouped by hierarchy tier columns.
 *
 * @param props - Matrix state and change handler.
 * @returns Permissions matrix JSX.
 */
export function AccessPermissionsMatrix({
  levels,
  levelPermissions,
  onChange,
}: AccessPermissionsMatrixProps) {
  const sortedLevels = [...levels].sort((a, b) => a.index - b.index);

  /**
   * Toggle a permission for one hierarchy tier.
   *
   * @param levelIndex - Tier index.
   * @param permission - Permission key.
   * @param enabled - Whether to grant the permission.
   */
  function togglePermission(
    levelIndex: AccessLevelIndex,
    permission: PermissionKey,
    enabled: boolean,
  ) {
    const current = levelPermissions[levelIndex] ?? [];
    const next = enabled
      ? [...new Set([...current, permission])]
      : current.filter((key) => key !== permission);

    onChange({
      ...levelPermissions,
      [levelIndex]: next,
    });
  }

  return (
    <div className="global-layout-editor__stack">
      <p className="text-sm text-(--color-text-secondary)">
        Default permissions granted to each tier before explicit delegation. Users also receive
        permissions delegated by higher tiers.
      </p>
      <div className="access-permissions-matrix-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--color-border-default) text-left">
              <th className="py-2 pr-4 font-medium text-(--color-text-primary)">Permission</th>
              {sortedLevels.map((level) => (
                <th
                  key={level.key}
                  className="px-2 py-2 text-center text-xs font-medium text-(--color-text-secondary)"
                >
                  {level.index}
                  <br />
                  <span className="font-normal">{level.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSION_KEYS.map((permission) => (
              <tr key={permission} className="border-b border-(--color-border-default)/50">
                <td className="py-2 pr-4 text-(--color-text-secondary)">
                  {PERMISSION_LABELS[permission]}
                  <div className="text-[10px] opacity-70">{permission}</div>
                </td>
                {sortedLevels.map((level) => {
                  const levelIndex = level.index as AccessLevelIndex;
                  const checked = (levelPermissions[levelIndex] ?? []).includes(permission);
                  return (
                    <td key={`${level.key}-${permission}`} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-label={`${PERMISSION_LABELS[permission]} for ${level.label}`}
                        onChange={(e) =>
                          togglePermission(levelIndex, permission, e.target.checked)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AccessPermissionsMatrix;
