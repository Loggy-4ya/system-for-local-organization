"use client";

/**
 * @fileoverview Page background settings for PageRoot sidebar.
 *
 * @module src/components/puck/fields/PageBackgroundFieldGroup
 */

import { AccentPresetField } from "./AccentPresetField";
import { BackgroundIcon, FieldChapter } from "./FieldChapter";
import { FieldLabelRow } from "./FieldLabelRow";
import { MediaUploadField } from "./MediaUploadField";
import { PuckSelectField } from "./PuckSelectField";
import { SegmentedControl } from "./SegmentedControl";
import { useTranslations } from "next-intl";

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
  const tChapters = useTranslations("puck.pageChapters");
  const t = useTranslations("puck.pageBackground");

  const set = (patch: Partial<PageBackgroundProps>) => {
    onChange({ ...background, ...patch });
  };

  return (
    <FieldChapter title={tChapters("pageBackground")} icon={<BackgroundIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">{t("style")}</span>
        <PuckSelectField
          value={mode}
          onChange={(next) => set({ background: next as PageBackgroundProps["background"] })}
          options={[
            { label: t("styleSiteDefault"), value: "site-default" },
            { label: t("styleSolid"), value: "solid" },
            { label: t("styleCustomImage"), value: "custom-image" },
          ]}
        />
      </div>

      {mode === "site-default" ? (
        <div className="nexus-field-category">
          <span className="nexus-field-category__label">{t("gridMotion")}</span>
          <SegmentedControl
            ariaLabel={t("gridMotionAria")}
            value={background.backgroundGridMotion ?? "dynamic"}
            onChange={(next) =>
              set({ backgroundGridMotion: next as PageBackgroundProps["backgroundGridMotion"] })
            }
            options={[
              { label: t("gridMotionDynamic"), value: "dynamic" },
              { label: t("gridMotionStatic"), value: "static" },
            ]}
          />
        </div>
      ) : null}

      {mode === "solid" ? (
        <div className="nexus-field-category">
          <AccentPresetField
            field={{ label: t("hue") }}
            value={background.backgroundPreset ?? "hue-blue"}
            onChange={(v) => set({ backgroundPreset: v })}
          />
        </div>
      ) : null}

      {mode === "custom-image" ? (
        <div className="nexus-field-category">
          <FieldLabelRow label={t("image")} hint={t("imageHint")} />
          <MediaUploadField
            field={{ label: t("image"), accept: "image", purpose: "page-cover" }}
            value={background.backgroundImage ?? ""}
            onChange={(v) => set({ backgroundImage: v })}
            hideFieldLabel
            showReadablePreview
          />
        </div>
      ) : null}
    </FieldChapter>
  );
}

export default PageBackgroundFieldGroup;
