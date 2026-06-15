"use client";

/**
 * @fileoverview Footer configuration editor panel.
 *
 * Imbued with beautiful, modern glassmorphic UI/UX styling, fully integrated with
 * the project's light/dark design tokens and matching Puck's collapsible sidebar layout.
 *
 * @module src/components/global-layout/FooterChromeEditor
 */

import React from "react";
import { Plus, Trash2, Sliders, Share2, Columns } from "lucide-react";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { EditorCollapsibleIsland } from "./EditorCollapsibleIsland";
import { FooterSectionLinksList } from "./FooterSectionLinksList";
import { FooterSocialLinksList } from "./FooterSocialLinksList";
import { useEditorSortableList } from "./useEditorSortableList";
import { EditorField } from "./EditorField";
import { EditorOptionBadgeGroup } from "./EditorOptionBadgeGroup";
import { EditorSectionHeader } from "./EditorSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldChapter } from "@/components/puck/fields/FieldChapter";
import { puckIcon } from "@/components/puck/lib/puckIcons";
import {
  DEFAULT_FOOTER_LAYOUT,
  type FooterConfig,
  type FooterSection,
  type FooterLink,
  type FooterSocialLink,
  type FooterLinkColumnCount,
} from "@shared/constants/globalLayout";

interface FooterChromeEditorProps {
  config: FooterConfig;
  onChange: (config: FooterConfig) => void;
}

export function FooterChromeEditor({ config, onChange }: FooterChromeEditorProps) {
  const footerLayout = config.layout ?? DEFAULT_FOOTER_LAYOUT;

  const updateField = (key: keyof FooterConfig, value: string) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  const updateLayoutColumns = (columns: FooterLinkColumnCount) => {
    onChange({
      ...config,
      layout: { columns },
    });
  };

  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    const newSection: FooterSection = {
      id: newId,
      title: "New Section",
      links: [],
    };
    onChange({
      ...config,
      sections: [...config.sections, newSection],
    });
  };

  const deleteSection = (secId: string) => {
    onChange({
      ...config,
      sections: config.sections.filter((s) => s.id !== secId),
    });
  };

  const updateSectionTitle = (secId: string, title: string) => {
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === secId ? { ...s, title: title || undefined } : s
      ),
    });
  };

  const addLink = (secId: string) => {
    const newLink: FooterLink = {
      id: `link-${Date.now()}`,
      href: "/",
      label: "New Link",
    };
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === secId ? { ...s, links: [...s.links, newLink] } : s
      ),
    });
  };

  const deleteLink = (secId: string, linkId: string) => {
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === secId ? { ...s, links: s.links.filter((l) => l.id !== linkId) } : s
      ),
    });
  };

  const updateLink = (secId: string, linkId: string, fields: Partial<FooterLink>) => {
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === secId
          ? {
              ...s,
              links: s.links.map((l) => (l.id === linkId ? { ...l, ...fields } : l)),
            }
          : s
      ),
    });
  };

  const addSocialLink = () => {
    const newSocial: FooterSocialLink = {
      id: `social-${Date.now()}`,
      href: "https://",
      label: "Social",
      icon: "Globe",
    };
    onChange({
      ...config,
      socialLinks: [...config.socialLinks, newSocial],
    });
  };

  const deleteSocialLink = (socialId: string) => {
    onChange({
      ...config,
      socialLinks: config.socialLinks.filter((s) => s.id !== socialId),
    });
  };

  const updateSocialLink = (socialId: string, fields: Partial<FooterSocialLink>) => {
    onChange({
      ...config,
      socialLinks: config.socialLinks.map((s) =>
        s.id === socialId ? { ...s, ...fields } : s
      ),
    });
  };

  const sectionSortable = useEditorSortableList({
    items: config.sections,
    onReorder: (sections) => onChange({ ...config, sections }),
  });

  const updateSectionLinks = (secId: string, links: FooterLink[]) => {
    onChange({
      ...config,
      sections: config.sections.map((s) => (s.id === secId ? { ...s, links } : s)),
    });
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Footer Branding & Info Chapter */}
      <FieldChapter title="Footer Branding" icon={puckIcon(Sliders)} defaultOpen={true}>
        <div className="global-layout-editor__stack">
          <EditorField
            label="Company Mention"
            hint="Short credit line shown above the copyright."
            htmlFor="footer-mention"
          >
            <Input
              id="footer-mention"
              type="text"
              value={config.mention || ""}
              onChange={(e) => updateField("mention", e.target.value)}
              placeholder="Built by Your Company 2026"
              className="text-xs"
            />
          </EditorField>
          <EditorField label="Copyright" hint="Legal line at the bottom of every page." htmlFor="footer-copyright">
            <Input
              id="footer-copyright"
              type="text"
              value={config.copyright || ""}
              onChange={(e) => updateField("copyright", e.target.value)}
              placeholder="© 2026 Project Nexus. All rights reserved."
              className="text-xs"
            />
          </EditorField>
        </div>
      </FieldChapter>

      {/* Social Links Chapter */}
      <FieldChapter title="Social Links" icon={puckIcon(Share2)} defaultOpen={true}>
        <div className="nexus-field-category global-layout-editor__stack">
          <EditorSectionHeader
            label="Social Handles"
            action={
              <Button type="button" className="global-layout-editor__btn-text" onClick={addSocialLink}>
                <Plus size={12} />
                Add Social
              </Button>
            }
          />

          <FooterSocialLinksList
            socialLinks={config.socialLinks}
            onSocialLinksChange={(socialLinks) => onChange({ ...config, socialLinks })}
            onUpdateSocialLink={updateSocialLink}
            onDeleteSocialLink={deleteSocialLink}
          />
        </div>
      </FieldChapter>

      {/* Footer Sections Chapter */}
      <FieldChapter title="Footer Columns" icon={puckIcon(Columns)} defaultOpen={true}>
        <div className="nexus-field-category global-layout-editor__stack">
          <div className="global-layout-editor__layout-grid">
            <EditorField
              label="Desktop Link Columns"
              hint="How many link columns appear in the published footer row (brand block stays separate)."
            >
              <EditorOptionBadgeGroup
                ariaLabel="Footer desktop link columns"
                value={String(footerLayout.columns)}
                onChange={(val) => updateLayoutColumns(Number(val) as FooterLinkColumnCount)}
                options={[
                  { label: "2", value: "2", title: "Two link columns", activeVariant: "default" },
                  { label: "3", value: "3", title: "Three link columns", activeVariant: "default" },
                  { label: "4", value: "4", title: "Four link columns", activeVariant: "default" },
                ]}
              />
            </EditorField>
          </div>

          <EditorSectionHeader
            label="Link Columns"
            action={
              <Button type="button" className="global-layout-editor__btn-text" onClick={addSection}>
                <Plus size={12} />
                Add Column
              </Button>
            }
          />

          {config.sections.length === 0 ? (
            <div className="global-layout-editor__empty">
              No link columns defined. Click &ldquo;Add Column&rdquo; to start.
            </div>
          ) : (
            <div className="global-layout-editor__footer-columns-stack global-layout-editor__stack">
              {config.sections.map((section, sectionIndex) => (
                <React.Fragment key={section.id}>
                  <EditorDropSlot active={sectionSortable.shouldShowDropSlotBefore(sectionIndex)} />
                  <EditorCollapsibleIsland
                    outerRef={(node) => sectionSortable.registerRowRef(sectionIndex, node)}
                    className={sectionSortable.getRowClassName(sectionIndex, "")}
                    summary={`${section.links.length} link${section.links.length === 1 ? "" : "s"}`}
                    header={
                      <div className="global-layout-editor__category-head global-layout-editor__footer-column-head">
                        <EditorDragHandle {...sectionSortable.getHandleProps(sectionIndex)} />
                        <Input
                          type="text"
                          value={section.title || ""}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          placeholder="Column title"
                          className="global-layout-editor__category-label-input text-xs font-medium"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="global-layout-editor__btn-text global-layout-editor__category-add-btn"
                          onClick={() => addLink(section.id)}
                        >
                          <Plus size={10} />
                          <span className="global-layout-editor__action-label">Add Link</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="global-layout-editor__btn-icon global-layout-editor__category-delete-btn"
                          onClick={() => deleteSection(section.id)}
                          aria-label="Delete column"
                          data-tooltip="Delete column"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    }
                  >
                    <FooterSectionLinksList
                      links={section.links}
                      onLinksChange={(links) => updateSectionLinks(section.id, links)}
                      onUpdateLink={(linkId, fields) => updateLink(section.id, linkId, fields)}
                      onDeleteLink={(linkId) => deleteLink(section.id, linkId)}
                    />
                  </EditorCollapsibleIsland>
                  <EditorDropSlot
                    active={
                      sectionIndex === config.sections.length - 1 &&
                      sectionSortable.shouldShowDropSlotAfter(sectionIndex)
                    }
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </FieldChapter>
    </div>
  );
}
