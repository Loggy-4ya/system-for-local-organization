"use client";

/**
 * @fileoverview Publication metadata fields for Puck PageRoot sidebar.
 *
 * Covers news-page essentials: description, cover image, scheduled publish,
 * publisher roster, and read-only engagement fields. Comment availability is
 * controlled on the **Comments** Puck block, not here.
 *
 * @module src/components/puck/fields/PagePublicationFieldGroup
 */

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
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
import { PuckSelectField } from "./PuckSelectField";
import { SegmentedControl } from "./SegmentedControl";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { NexusDateTimePicker } from "@/components/ui/NexusDateTimePicker";
import { Button } from "@/components/ui/button";
import {
  MAX_PAGE_GALLERY_IMAGES,
  NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS,
  type NewsCatalogImagesPerCard,
  type NewsCatalogPageCardVariant,
} from "@shared/constants/pageCategoriesHub";
import { collectPublicationImageUrls } from "@shared/lib/pageCategoriesHubLogic";
import { PagePublicationTelegramFields } from "./PagePublicationTelegramFields";

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
  /**
   * @deprecated Derived on save from {@link NEXUS_COMMENTS_BLOCK_TYPE} block props — not edited in Page Publication.
   */
  commentsEnabled?: boolean;
  /** Optional extra editors granted on this page. */
  delegatedEditors?: PageAccessEditorEntry[];
  /** Images shown on news catalog preview cards (capped by available publication images). */
  catalogImagesPerCard?: NewsCatalogImagesPerCard;
  /** Catalog preview card size — `featured` may use the section hero slot when eligible. */
  catalogCardVariant?: NewsCatalogPageCardVariant;
  /** Notify members via inbox and/or Telegram on first go-live. */
  notifyOnPublish?: boolean;
  /** Web inbox fan-out when {@link notifyOnPublish} is enabled. */
  notifyWebOnPublish?: boolean;
  /** Telegram DM fan-out when {@link notifyOnPublish} is enabled. */
  notifyTelegramOnPublish?: boolean;
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

/** Uppercase labels for publication gallery slots (`image2`–`image4`). */
const PUBLICATION_GALLERY_SLOT_LABELS = ["Visual II", "Visual III", "Visual IV"] as const;

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
    delegatedEditors: value?.delegatedEditors ?? meta.delegatedEditors ?? [],
    catalogImagesPerCard:
      value?.catalogImagesPerCard ?? meta.catalogImagesPerCard ?? 1,
    catalogCardVariant: value?.catalogCardVariant ?? meta.catalogCardVariant ?? "tile",
    notifyOnPublish: value?.notifyOnPublish ?? meta.notifyOnPublish ?? true,
    notifyWebOnPublish: value?.notifyWebOnPublish ?? meta.notifyWebOnPublish ?? true,
    notifyTelegramOnPublish:
      value?.notifyTelegramOnPublish ?? meta.notifyTelegramOnPublish ?? true,
  };
  const publicationRef = useRef(publication);
  publicationRef.current = publication;

  const availablePublicationImages = collectPublicationImageUrls(
    publication.coverImage,
    publication.galleryImages,
  );
  const maxCatalogImages = Math.max(
    1,
    Math.min(availablePublicationImages.length, NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS.at(-1) ?? 4),
  );
  const catalogImageOptions = NEWS_CATALOG_IMAGES_PER_CARD_OPTIONS.filter(
    (count) => count <= maxCatalogImages,
  );

  useEffect(() => {
    const current = publication.catalogImagesPerCard ?? 1;
    if (current <= maxCatalogImages) return;
    set({
      catalogImagesPerCard: maxCatalogImages as NewsCatalogImagesPerCard,
    });
  }, [maxCatalogImages, publication.catalogImagesPerCard]);

  const set = (patch: Partial<PagePublicationValue>) => {
    onChangeRef.current({ ...publicationRef.current, ...patch });
  };

  const galleryImages = (publication.galleryImages ?? []).filter((url) => url?.trim());

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
          showDropZone={false}
          emptyPickerLabel="Select cover image"
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Publication gallery"
          hint={
            "Optional supplemental visuals for catalog cards and ${{ image2 }}–${{ image4 }} page variables " +
            `(up to ${MAX_PAGE_GALLERY_IMAGES}).`
          }
        />
        <div className="nexus-publication-gallery">
          {galleryImages.map((galleryUrl, index) => (
            <div key={`gallery-${galleryUrl}-${index}`} className="nexus-publication-gallery__item">
              <div className="nexus-publication-gallery__item-head">
                <FieldLabelRow
                  label={PUBLICATION_GALLERY_SLOT_LABELS[index] ?? `Visual ${index + 2}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="nexus-publication-gallery__remove"
                  onClick={() => {
                    const next = [...galleryImages];
                    next.splice(index, 1);
                    set({ galleryImages: next });
                  }}
                  aria-label={`Remove ${PUBLICATION_GALLERY_SLOT_LABELS[index] ?? `gallery image ${index + 2}`}`}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </Button>
              </div>
              <MediaUploadField
                field={{
                  label: PUBLICATION_GALLERY_SLOT_LABELS[index] ?? `Visual ${index + 2}`,
                  accept: "image",
                  purpose: "page-cover",
                }}
                value={galleryUrl}
                onChange={(nextUrl) => {
                  const next = [...galleryImages];
                  next[index] = nextUrl;
                  set({ galleryImages: next });
                }}
                hideFieldLabel
                showReadablePreview
                showDropZone={false}
              />
            </div>
          ))}
          {galleryImages.length < MAX_PAGE_GALLERY_IMAGES ? (
            <MediaUploadField
              field={{ label: "Add to publication gallery", accept: "image", purpose: "page-cover" }}
              value=""
              onChange={(nextUrl) => {
                if (!nextUrl?.trim()) return;
                set({ galleryImages: [...galleryImages, nextUrl] });
              }}
              hideFieldLabel
              showReadablePreview={false}
              dropZoneLabel="Drop or click to add to gallery"
            />
          ) : null}
        </div>
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Catalog preview images"
          hint={
            availablePublicationImages.length > 0
              ? `How many publication images appear on this page's news catalog card (max ${maxCatalogImages} available).`
              : "Add a cover or gallery image first — catalog cards need at least one publication image."
          }
        />
        <PuckSelectField
          value={String(
            Math.min(publication.catalogImagesPerCard ?? 1, maxCatalogImages) as NewsCatalogImagesPerCard,
          )}
          onChange={(next) =>
            set({ catalogImagesPerCard: Number(next) as NewsCatalogImagesPerCard })
          }
          options={catalogImageOptions.map((count) => ({
            label: `${count} image${count === 1 ? "" : "s"}`,
            value: String(count),
          }))}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Catalog card size"
          hint="Featured cards may occupy the large hero slot in a catalog section when three or more pages are listed."
        />
        <SegmentedControl
          ariaLabel="Catalog card size"
          value={publication.catalogCardVariant ?? "tile"}
          onChange={(next) => set({ catalogCardVariant: next as NewsCatalogPageCardVariant })}
          options={[
            { label: "Standard", value: "tile" },
            { label: "Featured", value: "featured" },
          ]}
        />
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

      <PagePublicationTelegramFields
        value={{
          notifyOnPublish: publication.notifyOnPublish,
          notifyWebOnPublish: publication.notifyWebOnPublish,
          notifyTelegramOnPublish: publication.notifyTelegramOnPublish,
          description: publication.description,
        }}
        onChange={(patch) => set(patch)}
      />

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
          <PageMetaReadonlyRow label="Dislikes">
            <PageMetaBadge>{meta.dislikeCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
        </div>
      </div>
    </FieldChapter>
  );
}

export default PagePublicationFieldGroup;
