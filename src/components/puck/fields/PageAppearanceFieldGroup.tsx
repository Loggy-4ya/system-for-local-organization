"use client";

/**
 * @fileoverview Page background settings grouped for PageRoot.
 *
 * @module src/components/puck/fields/PageAppearanceFieldGroup
 */

import { AccentPresetField } from "./AccentPresetField";
import { BackgroundIcon, FieldChapter } from "./FieldChapter";
import { MediaUploadField } from "./MediaUploadField";
import { PuckSelectField } from "./PuckSelectField";
import {
  CONTENT_WIDTH_OPTIONS,
  DEFAULT_CONTENT_WIDTH,
} from "../lib/contentWidthTokens";
import { Rows3 } from "lucide-react";
import { puckIcon } from "../lib/puckIcons";

/** Page background and layout props stored under `appearance`. */
export interface PageAppearanceProps {
  background: "site-default" | "solid" | "custom-image";
  backgroundPreset?: string;
  backgroundImage?: string;
  contentWidth?: import("../lib/contentWidthTokens").ContentWidthToken;
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
    <>
      <FieldChapter title="Layout" icon={puckIcon(Rows3)}>
        <div className="nexus-field-category">
          <span className="nexus-field-category__label">Page Content Width</span>
          <PuckSelectField
            value={appearance.contentWidth ?? DEFAULT_CONTENT_WIDTH}
            onChange={(next) =>
              set({
                contentWidth: next as PageAppearanceProps["contentWidth"],
              })
            }
            options={CONTENT_WIDTH_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
        </div>
      </FieldChapter>

      <FieldChapter title="Background" icon={<BackgroundIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Style</span>
        <PuckSelectField
          value={mode}
          onChange={(next) =>
            set({ background: next as PageAppearanceProps["background"] })
          }
          options={[
            { label: "Site Default (Grid)", value: "site-default" },
            { label: "Solid Color", value: "solid" },
            { label: "Custom Image", value: "custom-image" },
          ]}
        />
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
    </>
  );
}

export default PageAppearanceFieldGroup;
