"use client";

/**
 * @fileoverview Page background settings grouped for PageRoot.
 *
 * @module src/components/puck/fields/PageAppearanceFieldGroup
 */

import { AccentPresetField } from "./AccentPresetField";
import { BackgroundIcon, FieldChapter } from "./FieldChapter";
import { MediaUploadField } from "./MediaUploadField";

/** Page background props stored under `appearance`. */
export interface PageAppearanceProps {
  background: "site-default" | "solid" | "custom-image";
  backgroundPreset?: string;
  backgroundImage?: string;
}

/** Puck custom field props. */
interface PageAppearanceFieldGroupProps {
  value: PageAppearanceProps;
  onChange: (value: PageAppearanceProps) => void;
}

/**
 * Categorized page background controls.
 *
 * @param props - Puck custom field props.
 * @returns Background field group UI.
 */
export function PageAppearanceFieldGroup({ value, onChange }: PageAppearanceFieldGroupProps) {
  const appearance = value ?? { background: "site-default" as const };
  const mode = appearance.background ?? "site-default";

  const set = (patch: Partial<PageAppearanceProps>) => {
    onChange({ ...appearance, ...patch });
  };

  return (
    <FieldChapter title="Background" icon={<BackgroundIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Style</span>
        <select
          className="nexus-puck-select"
          value={mode}
          onChange={(e) =>
            set({ background: e.target.value as PageAppearanceProps["background"] })
          }
        >
          <option value="site-default">Site Default (Grid)</option>
          <option value="solid">Solid Color</option>
          <option value="custom-image">Custom Image</option>
        </select>
      </div>

      {mode === "solid" ? (
        <div className="nexus-field-category">
          <AccentPresetField
            field={{ label: "Hue" }}
            value={appearance.backgroundPreset ?? "hue-blue"}
            onChange={(v) => set({ backgroundPreset: v })}
          />
        </div>
      ) : null}

      {mode === "custom-image" ? (
        <div className="nexus-field-category">
          <MediaUploadField
            field={{ label: "Image" }}
            value={appearance.backgroundImage ?? ""}
            onChange={(v) => set({ backgroundImage: v })}
          />
        </div>
      ) : null}
    </FieldChapter>
  );
}

export default PageAppearanceFieldGroup;
