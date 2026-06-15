"use client";

/**
 * @fileoverview Sortable social link rows for the Global Layout footer editor.
 *
 * @module src/components/global-layout/FooterSocialLinksList
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { LucideIconPicker } from "./LucideIconPicker";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { useEditorSortableList } from "./useEditorSortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type FooterSocialLink } from "@shared/constants/globalLayout";

/** Props for {@link FooterSocialLinksList}. */
export interface FooterSocialLinksListProps {
  /** Social links in display order. */
  socialLinks: FooterSocialLink[];
  /** Replace the list after reorder. */
  onSocialLinksChange: (socialLinks: FooterSocialLink[]) => void;
  /** Patch one social link. */
  onUpdateSocialLink: (socialId: string, fields: Partial<FooterSocialLink>) => void;
  /** Remove one social link. */
  onDeleteSocialLink: (socialId: string) => void;
}

/**
 * Drag-reorderable social handle rows (icon before label and URL).
 *
 * @param props - See {@link FooterSocialLinksListProps}.
 * @returns Social link list JSX.
 */
export function FooterSocialLinksList({
  socialLinks,
  onSocialLinksChange,
  onUpdateSocialLink,
  onDeleteSocialLink,
}: FooterSocialLinksListProps) {
  const sortable = useEditorSortableList({
    items: socialLinks,
    onReorder: onSocialLinksChange,
  });

  if (socialLinks.length === 0) {
    return <div className="global-layout-editor__empty py-6">No social links defined.</div>;
  }

  return (
    <div className="global-layout-editor__stack">
      <div className="global-layout-editor__grid-labels global-layout-editor__social-grid-labels">
        <span />
        <span>Icon</span>
        <span>Label</span>
        <span>URL</span>
        <span />
      </div>
      {socialLinks.map((social, socialIndex) => (
        <React.Fragment key={social.id}>
          <EditorDropSlot active={sortable.shouldShowDropSlotBefore(socialIndex)} />
          <div
            ref={(node) => sortable.registerRowRef(socialIndex, node)}
            className={sortable.getRowClassName(
              socialIndex,
              "global-layout-editor__item-row global-layout-editor__nav-item-row global-layout-editor__social-item-row",
            )}
          >
            <div className="global-layout-editor__nav-item-head">
              <EditorDragHandle {...sortable.getHandleProps(socialIndex)} />
              <Button
                type="button"
                variant="destructive"
                className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--mobile global-layout-editor__btn-icon sm:hidden"
                onClick={() => onDeleteSocialLink(social.id)}
                aria-label="Delete social link"
                data-tooltip="Delete social link"
              >
                <Trash2 size={14} />
              </Button>
            </div>

            <div className="global-layout-editor__nav-item-icon">
              <span className="global-layout-editor__nav-field-label">Icon</span>
              <LucideIconPicker
                tooltip="Social icon"
                value={social.icon}
                onChange={(icon) => onUpdateSocialLink(social.id, { icon: icon || "Globe" })}
              />
            </div>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">Label</span>
              <Input
                type="text"
                value={social.label}
                onChange={(e) => onUpdateSocialLink(social.id, { label: e.target.value })}
                placeholder="Label"
                className="text-xs min-w-0 w-full"
              />
            </label>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">URL</span>
              <Input
                type="text"
                value={social.href}
                onChange={(e) => onUpdateSocialLink(social.id, { href: e.target.value })}
                placeholder="https://"
                className="text-xs min-w-0 w-full"
              />
            </label>

            <Button
              type="button"
              variant="destructive"
              className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--desktop global-layout-editor__btn-icon"
              onClick={() => onDeleteSocialLink(social.id)}
              aria-label="Delete social link"
              data-tooltip="Delete social link"
            >
              <Trash2 size={14} />
            </Button>
          </div>
          <EditorDropSlot active={sortable.shouldShowDropSlotAfter(socialIndex)} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default FooterSocialLinksList;
