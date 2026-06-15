"use client";

/**
 * @fileoverview Sortable footer link rows inside one column.
 *
 * @module src/components/global-layout/FooterSectionLinksList
 */

import React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { EditorDragHandle } from "./EditorDragHandle";
import { EditorDropSlot } from "./EditorDropSlot";
import { EditorFlagBadge } from "./EditorFlagBadge";
import { useEditorSortableList } from "./useEditorSortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type FooterLink } from "@shared/constants/globalLayout";

/** Props for {@link FooterSectionLinksList}. */
export interface FooterSectionLinksListProps {
  /** Links in display order. */
  links: FooterLink[];
  /** Replace the link list after reorder. */
  onLinksChange: (links: FooterLink[]) => void;
  /** Patch one link. */
  onUpdateLink: (linkId: string, fields: Partial<FooterLink>) => void;
  /** Remove one link. */
  onDeleteLink: (linkId: string) => void;
}

/**
 * Drag-reorderable footer column link rows.
 *
 * @param props - See {@link FooterSectionLinksListProps}.
 * @returns Footer link list JSX.
 */
export function FooterSectionLinksList({
  links,
  onLinksChange,
  onUpdateLink,
  onDeleteLink,
}: FooterSectionLinksListProps) {
  const sortable = useEditorSortableList({
    items: links,
    onReorder: onLinksChange,
  });

  if (links.length === 0) {
    return <div className="global-layout-editor__empty py-6">No links in this column.</div>;
  }

  return (
    <div className="global-layout-editor__stack">
      <div className="global-layout-editor__grid-labels global-layout-editor__footer-link-grid-labels">
        <span />
        <span>Label</span>
        <span>URL</span>
        <span>Flags</span>
        <span />
      </div>
      {links.map((link, linkIndex) => (
        <React.Fragment key={link.id}>
          <EditorDropSlot active={sortable.shouldShowDropSlotBefore(linkIndex)} />
          <div
            ref={(node) => sortable.registerRowRef(linkIndex, node)}
            className={sortable.getRowClassName(
              linkIndex,
              "global-layout-editor__item-row global-layout-editor__nav-item-row global-layout-editor__footer-link-item-row",
            )}
          >
            <div className="global-layout-editor__nav-item-head">
              <EditorDragHandle {...sortable.getHandleProps(linkIndex)} />
              <Button
                type="button"
                variant="destructive"
                className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--mobile global-layout-editor__btn-icon sm:hidden"
                onClick={() => onDeleteLink(link.id)}
                aria-label="Delete link"
                data-tooltip="Delete link"
              >
                <Trash2 size={12} />
              </Button>
            </div>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">Label</span>
              <Input
                type="text"
                value={link.label}
                onChange={(e) => onUpdateLink(link.id, { label: e.target.value })}
                placeholder="Label"
                className="text-xs min-w-0 w-full"
              />
            </label>

            <label className="global-layout-editor__nav-field">
              <span className="global-layout-editor__nav-field-label">URL</span>
              <Input
                type="text"
                value={link.href}
                onChange={(e) => onUpdateLink(link.id, { href: e.target.value })}
                placeholder="/path"
                className="text-xs min-w-0 w-full"
              />
            </label>

            <div className="global-layout-editor__nav-item-flags">
              <span className="global-layout-editor__nav-field-label">Flags</span>
              <EditorFlagBadge
                label="External link"
                icon={<ExternalLink size={14} strokeWidth={2.25} aria-hidden />}
                active={Boolean(link.external)}
                activeVariant="secondary"
                onToggle={() => onUpdateLink(link.id, { external: !link.external })}
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              className="global-layout-editor__nav-item-delete global-layout-editor__nav-item-delete--desktop global-layout-editor__btn-icon"
              onClick={() => onDeleteLink(link.id)}
              aria-label="Delete link"
              data-tooltip="Delete link"
            >
              <Trash2 size={12} />
            </Button>
          </div>
          <EditorDropSlot active={sortable.shouldShowDropSlotAfter(linkIndex)} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default FooterSectionLinksList;
