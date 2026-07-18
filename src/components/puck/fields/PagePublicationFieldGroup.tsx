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
import { useTranslations } from "next-intl";
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

/** Uppercase labels for publication gallery slots (`image2`–`image4`) — English fallbacks for media field metadata. */
const PUBLICATION_GALLERY_SLOT_LABELS = ["Visual II", "Visual III", "Visual IV"] as const;

/**
 * Resolve a translated gallery slot label for sidebar UI.
 *
 * @param t - `puck.pagePublication` translator.
 * @param index - Zero-based gallery index.
 * @returns Localized slot label.
 */
function resolveGallerySlotLabel(
  t: (key: "galleryVisual2" | "galleryVisual3" | "galleryVisual4" | "galleryVisualN", values?: { n: number }) => string,
  index: number,
): string {
  if (index === 0) return t("galleryVisual2");
  if (index === 1) return t("galleryVisual3");
  if (index === 2) return t("galleryVisual4");
  return t("galleryVisualN", { n: index + 2 });
}

/**
 * Format an ISO timestamp for read-only badge display.
 *
 * @param iso - ISO string or empty.
 * @param emptyLabel - Placeholder when unset.
 * @returns Localised label or placeholder when unset.
 */
function formatReadOnlyTimestamp(iso: string | null | undefined, emptyLabel: string): string {
  if (!iso) return emptyLabel;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return emptyLabel;
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
  const tChapters = useTranslations("puck.pageChapters");
  const t = useTranslations("puck.pagePublication");
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
    <FieldChapter title={tChapters("publication")} icon={<SettingsIcon />}>
      <div className="nexus-field-category">
        <FieldLabelRow label={t("description")} hint={t("descriptionHint")} />
        <textarea
          className="nexus-puck-input nexus-puck-textarea"
          rows={4}
          value={publication.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow label={t("coverImage")} hint={t("coverImageHint")} />
        <MediaUploadField
          field={{ label: t("coverImage"), accept: "image", purpose: "page-cover" }}
          value={publication.coverImage ?? ""}
          onChange={(coverImage) => set({ coverImage })}
          hideFieldLabel
          showReadablePreview
          showDropZone={false}
          emptyPickerLabel={t("selectCoverImage")}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label={t("publicationGallery")}
          hint={t("publicationGalleryHint", { max: MAX_PAGE_GALLERY_IMAGES })}
        />
        <div className="nexus-publication-gallery">
          {galleryImages.map((galleryUrl, index) => {
            const slotLabel = resolveGallerySlotLabel(t, index);
            return (
            <div key={`gallery-${galleryUrl}-${index}`} className="nexus-publication-gallery__item">
              <div className="nexus-publication-gallery__item-head">
                <FieldLabelRow label={slotLabel} />
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
                  aria-label={t("removeGalleryImage", { label: slotLabel })}
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
            );
          })}
          {galleryImages.length < MAX_PAGE_GALLERY_IMAGES ? (
            <MediaUploadField
              field={{ label: t("addToGallery"), accept: "image", purpose: "page-cover" }}
              value=""
              onChange={(nextUrl) => {
                if (!nextUrl?.trim()) return;
                set({ galleryImages: [...galleryImages, nextUrl] });
              }}
              hideFieldLabel
              showReadablePreview={false}
              dropZoneLabel={t("dropOrClickGallery")}
            />
          ) : null}
        </div>
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label={t("catalogPreviewImages")}
          hint={
            availablePublicationImages.length > 0
              ? t("catalogPreviewImagesHint", { max: maxCatalogImages })
              : t("catalogPreviewImagesEmptyHint")
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
            label: t("catalogImageCount", { count }),
            value: String(count),
          }))}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow label={t("catalogCardSize")} hint={t("catalogCardSizeHint")} />
        <SegmentedControl
          ariaLabel={t("catalogCardSizeAria")}
          value={publication.catalogCardVariant ?? "tile"}
          onChange={(next) => set({ catalogCardVariant: next as NewsCatalogPageCardVariant })}
          options={[
            { label: t("catalogCardStandard"), value: "tile" },
            { label: t("catalogCardFeatured"), value: "featured" },
          ]}
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow label={t("publishDateTime")} hint={t("publishDateTimeHint")} />
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
          label={t("publisher")}
          hint={
            meta.canManagePageAccess
              ? t("publisherHintManage", { max: MAX_PAGE_ACCESS_EDITORS })
              : t("publisherHintReadonly")
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
        <FieldLabelRow label={t("pageStats")} hint={t("pageStatsHint")} />
        <div className="nexus-page-meta-readonly">
          <PageMetaReadonlyRow label={t("statsCreated")}>
            <PageMetaBadge muted={!meta.createdAt}>
              {formatReadOnlyTimestamp(meta.createdAt, t("emptyTimestamp"))}
            </PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label={t("statsLastUpdated")}>
            <PageMetaBadge muted={!meta.updatedAt}>
              {formatReadOnlyTimestamp(meta.updatedAt, t("emptyTimestamp"))}
            </PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label={t("statsViews")}>
            <PageMetaBadge>{meta.viewCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label={t("statsLikes")}>
            <PageMetaBadge>{meta.likeCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
          <PageMetaReadonlyRow label={t("statsDislikes")}>
            <PageMetaBadge>{meta.dislikeCount ?? 0}</PageMetaBadge>
          </PageMetaReadonlyRow>
        </div>
      </div>
    </FieldChapter>
  );
}

export default PagePublicationFieldGroup;
