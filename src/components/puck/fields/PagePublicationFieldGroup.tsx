"use client";

/**
 * @fileoverview Publication metadata fields for Puck PageRoot sidebar.
 *
 * Covers news-page essentials: description, cover image, scheduled publish,
 * comments toggle, publisher roster, and read-only engagement fields.
 *
 * @module src/components/puck/fields/PagePublicationFieldGroup
 */

import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  MAX_PAGE_ACCESS_EDITORS,
  type PageAccessEditorEntry,
} from "@shared/lib/pageAccessLogic";
import { FieldChapter, SettingsIcon } from "./FieldChapter";
import { FieldLabelRow } from "./FieldLabelRow";
import { MediaUploadField } from "./MediaUploadField";
import { PageAccessEditorsField } from "./PageAccessEditorsField";
import { PagePublisherInviteShare } from "./PagePublisherInviteShare";
import { PageMetaBadge } from "./PageMetaBadge";
import { PageMetaReadonlyRow } from "./PageMetaReadonlyRow";
import { PuckSwitchField } from "./PuckSwitchField";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { NexusDateTimePicker } from "@/components/ui/NexusDateTimePicker";
import { Button } from "@/components/ui/button";
import { MAX_PAGE_GALLERY_IMAGES } from "@shared/constants/pageCategoriesHub";

/** Editable publication props stored under root `pagePublication`. */
export interface PagePublicationValue {
  /** Short summary for cards and SEO. */
  description?: string;
  /** Hero cover image URL. */
  coverImage?: string;
  /** Additional publication gallery images (`image2`–`image4`). */
  galleryImages?: string[];
  /** ISO publish schedule — null means immediate on publish. */
  publishAt?: string | null;
  /** Whether comments are enabled on the public page. */
  commentsEnabled?: boolean;
  /** Optional extra editors granted on this page. */
  delegatedEditors?: PageAccessEditorEntry[];
  /**
   * @deprecated Legacy storage — read {@link resolvePageSettingsCategories} instead.
   */
  categories?: string[];
}

/** Puck custom field props. */
interface PagePublicationFieldGroupProps {
  value: PagePublicationValue;
  onChange: (value: PagePublicationValue) => void;
}

/**
 * Format an ISO timestamp for read-only badge display.
 *
 * @param iso - ISO string or empty.
 * @returns Localised label or placeholder when unset.
 */
function formatReadOnlyTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Publication and engagement chapter for PageRoot.
 *
 * @param props - Puck custom field props.
 * @returns Publication settings UI.
 */
export function PagePublicationFieldGroup({
  value,
  onChange,
}: PagePublicationFieldGroupProps) {
  const meta = usePageEditorMeta();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const publication: PagePublicationValue = {
    description: value?.description ?? meta.description ?? "",
    coverImage: value?.coverImage ?? meta.coverImage ?? "",
    galleryImages: value?.galleryImages ?? meta.galleryImages ?? [],
    publishAt: value?.publishAt ?? meta.publishAt ?? null,
    commentsEnabled: value?.commentsEnabled ?? meta.commentsEnabled ?? true,
    delegatedEditors: value?.delegatedEditors ?? meta.delegatedEditors ?? [],
  };
  const publicationRef = useRef(publication);
  publicationRef.current = publication;

  const set = (patch: Partial<PagePublicationValue>) => {
    onChangeRef.current({ ...publicationRef.current, ...patch });
  };

  return (
    <FieldChapter title="Publication" icon={<SettingsIcon />}>
      <div className="nexus-field-category">
        <FieldLabelRow
          label="Description"
          hint="Short summary for news cards and search previews."
        />
        <textarea
          className="nexus-puck-input nexus-puck-textarea"
          rows={4}
          value={publication.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Brief page summary…"
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Cover Image"
          hint="Hero image for news listings. Preview uses contain scaling so text stays readable."
        />
        <MediaUploadField
          field={{ label: "Cover Image", accept: "image", purpose: "page-cover" }}
          value={publication.coverImage ?? ""}
          onChange={(coverImage) => set({ coverImage })}
          hideFieldLabel
          showReadablePreview
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Gallery Images"
          hint={
            "Optional extra images for news catalog cards and ${{ image2 }}–${{ image4 }} page variables " +
            `(max ${MAX_PAGE_GALLERY_IMAGES}).`
          }
        />
        <div className="flex flex-col gap-3">
          {(publication.galleryImages ?? []).map((galleryUrl, index) => (
            <div key={`gallery-${index}`} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Gallery image {index + 2}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    const next = [...(publication.galleryImages ?? [])];
                    next.splice(index, 1);
                    set({ galleryImages: next });
                  }}
                  aria-label={`Remove gallery image ${index + 2}`}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </Button>
              </div>
              <MediaUploadField
                field={{
                  label: `Gallery image ${index + 2}`,
                  accept: "image",
                  purpose: "page-cover",
                }}
                value={galleryUrl}
                onChange={(nextUrl) => {
                  const next = [...(publication.galleryImages ?? [])];
                  next[index] = nextUrl;
                  set({ galleryImages: next });
                }}
                hideFieldLabel
                showReadablePreview
              />
            </div>
          ))}
          {(publication.galleryImages?.length ?? 0) < MAX_PAGE_GALLERY_IMAGES ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                set({ galleryImages: [...(publication.galleryImages ?? []), ""] })
              }
            >
              <Plus size={14} aria-hidden="true" />
              Add gallery image
            </Button>
          ) : null}
        </div>
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Publish Date & Time"
          hint="Leave empty to publish immediately when you click Publish. Future dates schedule automatic go-live."
        />
        <NexusDateTimePicker
          value={publication.publishAt ?? null}
          onChange={(publishAt) => set({ publishAt })}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow label="Comments" hint="Allow community comments on this page." />
        <div className="nexus-sidebar-field">
          <PuckSwitchField
            label="Enable comments"
            value={(publication.commentsEnabled ?? true) ? "on" : "off"}
            trueValue="on"
            falseValue="off"
            onChange={(next) => set({ commentsEnabled: next === "on" })}
          />
        </div>
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Publisher"
          hint={
            meta.canManagePageAccess
              ? `Primary author plus optional extra publishers (max ${MAX_PAGE_ACCESS_EDITORS}). Click + to search users, or share an invite link below.`
              : "Recorded on first publish. Extra publishers can be added by admins and the primary author."
          }
        />
        <div className="nexus-page-publisher-settings">
          <PageAccessEditorsField
            value={publication.delegatedEditors ?? []}
            onChange={(delegatedEditors) => set({ delegatedEditors })}
            collapsibleSearch
          />
          <PagePublisherInviteShare />
        </div>
      </div>

      <div className="nexus-field-category nexus-field-category--meta-readonly">
        <FieldLabelRow label="Page Stats" hint="Read-only counters and timestamps from the database." />
        <div className="nexus-page-meta-readonly">
          <PageMetaReadonlyRow label="Created">
            <PageMetaBadge muted={!meta.createdAt}>
              {formatReadOnlyTimestamp(meta.createdAt)}
            </PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label="Last updated">
            <PageMetaBadge muted={!meta.updatedAt}>
              {formatReadOnlyTimestamp(meta.updatedAt)}
            </PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label="Views">
            <PageMetaBadge>{meta.viewCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label="Likes">
            <PageMetaBadge>{meta.likeCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
        </div>
      </div>
    </FieldChapter>
  );
}

export default PagePublicationFieldGroup;
