"use client";

/**
 * @fileoverview Page background settings for PageRoot sidebar.
 *
 * @module src/components/puck/fields/PageBackgroundFieldGroup
 */

import { AccentPresetField } from "./AccentPresetField";
import { BackgroundIcon, FieldChapter } from "./FieldChapter";
import { MediaUploadField } from "./MediaUploadField";
import { PuckSelectField } from "./PuckSelectField";
import { SegmentedControl } from "./SegmentedControl";

/** Background props stored under root `pageBackground`. */
export interface PageBackgroundProps {
  background: "site-default" | "solid" | "custom-image";
  /**
   * Grid animation for `site-default` backgrounds in the Puck editor preview.
   * `dynamic` (default) — scrolling tiles and cursor spotlight; `static` — frozen tile offset, cursor ambient blur retained.
   */
  backgroundGridMotion?: "dynamic" | "static";
  backgroundPreset?: string;
  backgroundImage?: string;
}

/** Puck custom field props for page background. */
interface PageBackgroundFieldGroupProps {
  value: PageBackgroundProps;
  onChange: (value: PageBackgroundProps) => void;
}

/**
 * Page background chapter in the Puck root sidebar.
 *
 * @param props - Puck custom field props.
 * @returns Background field chapter UI.
 */
export function PageBackgroundFieldGroup({ value, onChange }: PageBackgroundFieldGroupProps) {
  const background = value ?? { background: "site-default" as const };
  const mode = background.background ?? "site-default";

  const set = (patch: Partial<PageBackgroundProps>) => {
    onChange({ ...background, ...patch });
  };

  return (
    <FieldChapter title="Background" icon={<BackgroundIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Style</span>
        <PuckSelectField
          value={mode}
          onChange={(next) => set({ background: next as PageBackgroundProps["background"] })}
          options={[
            { label: "Site Default (Grid)", value: "site-default" },
            { label: "Solid Color", value: "solid" },
            { label: "Custom Image", value: "custom-image" },
          ]}
        />
      </div>

      {mode === "site-default" ? (
        <div className="nexus-field-category">
          <span className="nexus-field-category__label">Grid Motion</span>
          <SegmentedControl
            ariaLabel="Grid motion"
            value={background.backgroundGridMotion ?? "dynamic"}
            onChange={(next) =>
              set({ backgroundGridMotion: next as PageBackgroundProps["backgroundGridMotion"] })
            }
            options={[
              { label: "Dynamic", value: "dynamic" },
              { label: "Static", value: "static" },
            ]}
          />
        </div>
      ) : null}

      {mode === "solid" ? (
        <div className="nexus-field-category">
          <AccentPresetField
            field={{ label: "Hue" }}
            value={background.backgroundPreset ?? "hue-blue"}
            onChange={(v) => set({ backgroundPreset: v })}
          />
        </div>
      ) : null}

      {mode === "custom-image" ? (
        <div className="nexus-field-category">
          <MediaUploadField
            field={{ label: "Image" }}
            value={background.backgroundImage ?? ""}
            onChange={(v) => set({ backgroundImage: v })}
          />
        </div>
      ) : null}
    </FieldChapter>
  );
}

export default PageBackgroundFieldGroup;
