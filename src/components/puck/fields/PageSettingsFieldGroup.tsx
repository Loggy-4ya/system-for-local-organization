"use client";

/**
 * @fileoverview Page title and URL slug controls for Puck PageRoot sidebar.
 *
 * @module src/components/puck/fields/PageSettingsFieldGroup
 */

import { FieldChapter, SettingsIcon } from "./FieldChapter";
import { normalizePagePath } from "../PagePathEditor";

/** Page metadata stored under root `pageSettings`. */
export interface PageSettingsValue {
  /** Human-readable page title. */
  title: string;
  /** URL slug without leading slash (empty string for homepage). */
  slug: string;
  /** When true, slug cannot be edited (homepage). */
  slugLocked?: boolean;
}

/** Puck custom field props for page settings. */
interface PageSettingsFieldGroupProps {
  value: PageSettingsValue;
  onChange: (value: PageSettingsValue) => void;
}

/**
 * Full-width page title and slug editor grouped under Page Settings.
 *
 * @param props - Puck custom field props.
 * @returns Page settings chapter UI.
 */
export function PageSettingsFieldGroup({ value, onChange }: PageSettingsFieldGroupProps) {
  const settings: PageSettingsValue = {
    title: value?.title ?? "Untitled Page",
    slug: value?.slug ?? "",
    slugLocked: value?.slugLocked ?? false,
  };

  const previewSlug = settings.slugLocked
    ? ""
    : normalizePagePath(settings.slug).replace(/^\//, "") || "(homepage)";

  const set = (patch: Partial<PageSettingsValue>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <FieldChapter title="Page Settings" icon={<SettingsIcon />} defaultOpen>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Page Title</span>
        <input
          type="text"
          className="nexus-puck-input"
          value={settings.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Untitled Page"
        />
      </div>

      <div className="nexus-field-category">
        <span className="nexus-field-category__label">URL Slug</span>
        <div className="nexus-page-slug-row">
          <span className="nexus-page-slug-row__prefix">/</span>
          <input
            type="text"
            className="nexus-puck-input nexus-page-slug-row__input"
            value={settings.slug}
            onChange={(e) => set({ slug: e.target.value })}
            disabled={settings.slugLocked}
            placeholder={settings.slugLocked ? "" : "page-path"}
            title={
              settings.slugLocked
                ? "The homepage URL cannot be renamed"
                : "Edit page URL path"
            }
          />
        </div>
        <p className="nexus-page-slug-preview">
          Preview: <code>yoursite.com/{previewSlug}</code>
        </p>
      </div>
    </FieldChapter>
  );
}

export default PageSettingsFieldGroup;
