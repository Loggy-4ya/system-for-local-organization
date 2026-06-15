"use client";

/**
 * @fileoverview Page appearance prop types and legacy combined field group.
 *
 * @module src/components/puck/fields/PageAppearanceFieldGroup
 */

import type { ContentWidthToken } from "../lib/contentWidthTokens";
import { PageBackgroundFieldGroup } from "./PageBackgroundFieldGroup";
import { PageLayoutFieldGroup } from "./PageLayoutFieldGroup";

/** Page background and layout props stored under `appearance`. */
export interface PageAppearanceProps {
  background: "site-default" | "solid" | "custom-image";
  /**
   * Grid animation for `site-default` backgrounds in the Puck editor preview.
   * `dynamic` (default) — scrolling tiles and cursor spotlight; `static` — frozen tile offset, cursor ambient blur retained.
   */
  backgroundGridMotion?: "dynamic" | "static";
  backgroundPreset?: string;
  backgroundImage?: string;
  contentWidth?: ContentWidthToken;
}

/** Puck custom field props. */
interface PageAppearanceFieldGroupProps {
  value: PageAppearanceProps;
  onChange: (value: PageAppearanceProps) => void;
}

/**
 * Legacy combined layout + background group.
 *
 * Page root now registers `pageLayout` and `pageBackground` as separate Puck fields
 * (same pattern as block {@link BlockFieldChapterGroup} chapters).
 *
 * @param props - Puck custom field props.
 * @returns Layout and background chapters.
 */
export function PageAppearanceFieldGroup({ value, onChange }: PageAppearanceFieldGroupProps) {
  const appearance = value ?? { background: "site-default" as const };

  const set = (patch: Partial<PageAppearanceProps>) => {
    onChange({ ...appearance, ...patch });
  };

  return (
    <>
      <PageLayoutFieldGroup
        value={{ contentWidth: appearance.contentWidth }}
        onChange={(layout) => set({ contentWidth: layout.contentWidth })}
      />
      <PageBackgroundFieldGroup
        value={{
          background: appearance.background,
          backgroundGridMotion: appearance.backgroundGridMotion,
          backgroundPreset: appearance.backgroundPreset,
          backgroundImage: appearance.backgroundImage,
        }}
        onChange={(background) => set(background)}
      />
    </>
  );
}

export default PageAppearanceFieldGroup;
