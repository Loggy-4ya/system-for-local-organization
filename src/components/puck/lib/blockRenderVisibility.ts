/**
 * @fileoverview Pure layout visibility models for Puck blocks on the editor canvas.
 *
 * Guards against zero-height / absolute-fill regressions where blocks exist in the
 * outline but collapse on the page (e.g. video with `carouselFill: "fill"` on root).
 *
 * Tests: `tests/puck/lib/blockRenderVisibility.test.ts` — `npm run test:block-render-visibility`
 *
 * @module src/components/puck/lib/blockRenderVisibility
 */

import {
  type CarouselMediaFillMode,
} from "./carouselMediaFill";
import {
  resolveVideoDisplayAspectRatio,
} from "./embedMedia";
import {
  MEDIA_ASPECT_RATIO_DEFAULTS,
  resolveMediaAspectRatioNumeric,
} from "./mediaAspectRatio";

/** Where a media block is rendered on the Puck canvas. */
export type MediaBlockPlacement = "pageRoot" | "carouselSlide" | "carouselComposite";

/** Resolved layout flags that determine whether media is visible on the canvas. */
export interface MediaBlockLayoutModel {
  /** True when fill-slide / absolute-cover layout is active. */
  fillSlide: boolean;
  /** Numeric width÷height used for aspect-ratio sizing. */
  aspectRatio: number;
  /** Fill-slide layout active (in-flow by default; absolute only under stretch carousel classes). */
  usesAbsoluteFill: boolean;
  /** Block defines height via aspect-ratio frame (safe on page root). */
  hasAspectRatioFrame: boolean;
}

/** Visibility verdict for a block on the page root canvas. */
export interface BlockPageVisibility {
  /** Puck component registry key. */
  blockType: string;
  /** Whether default props should render visibly on the page root. */
  visibleOnPageRoot: boolean;
  /** Human-readable reason when not visible. */
  reason?: string;
}

/**
 * Resolve whether fill-slide layout applies without requiring a live DOM root.
 *
 * @param carouselFill - Sidebar / hardcoded carousel fill preset.
 * @param placement - Canvas placement for the block.
 * @returns True when fill-slide classes and absolute positioning should apply.
 */
export function resolveMediaFillSlide(
  carouselFill: CarouselMediaFillMode | undefined,
  placement: MediaBlockPlacement,
): boolean {
  const mode = carouselFill ?? "auto";
  switch (mode) {
    case "fill":
      return true;
    case "natural":
      return false;
    case "auto":
    default:
      if (placement === "pageRoot") return false;
      if (placement === "carouselComposite") return false;
      return placement === "carouselSlide";
  }
}

/**
 * Resolve video block layout model for visibility checks.
 *
 * @param params - Video URL, aspect ratio, and carousel fill preset.
 * @param placement - Canvas placement.
 * @returns Layout model describing fill mode and intrinsic sizing.
 */
export function resolveVideoBlockLayoutModel(
  params: {
    url: string;
    aspectRatioPreset: string;
    aspectRatioCustom?: string;
    carouselFill: CarouselMediaFillMode;
  },
  placement: MediaBlockPlacement,
): MediaBlockLayoutModel {
  const fillSlide = resolveMediaFillSlide(params.carouselFill, placement);
  const aspectRatio = resolveVideoDisplayAspectRatio(
    params.url,
    params.aspectRatioPreset,
    params.aspectRatioCustom,
    resolveMediaAspectRatioNumeric,
  );

  return {
    fillSlide,
    aspectRatio,
    usesAbsoluteFill: fillSlide,
    hasAspectRatioFrame: !fillSlide,
  };
}

/**
 * Resolve image block layout model for visibility checks.
 *
 * @param params - Image carousel fill and aspect ratio settings.
 * @param placement - Canvas placement.
 * @returns Layout model describing fill mode and intrinsic sizing.
 */
export function resolveImageBlockLayoutModel(
  params: {
    aspectRatioPreset: string;
    aspectRatioCustom?: string;
    carouselFill: CarouselMediaFillMode;
  },
  placement: MediaBlockPlacement,
): MediaBlockLayoutModel {
  const fillSlide = resolveMediaFillSlide(params.carouselFill, placement);
  const aspectRatio = resolveMediaAspectRatioNumeric(
    params.aspectRatioPreset,
    params.aspectRatioCustom,
  );

  return {
    fillSlide,
    aspectRatio,
    usesAbsoluteFill: fillSlide,
    hasAspectRatioFrame: !fillSlide,
  };
}

/**
 * Whether a media layout model renders with non-zero height on the page root.
 *
 * Fill-slide on page root uses `position: absolute` without a sized parent and collapses.
 *
 * @param model - Resolved media layout model.
 * @param placement - Canvas placement (must be `pageRoot` for page visibility).
 * @returns True when the block should be visible on the page canvas.
 */
export function isMediaBlockVisibleOnPage(
  model: MediaBlockLayoutModel,
  placement: MediaBlockPlacement,
): boolean {
  if (placement !== "pageRoot") return true;
  if (model.fillSlide) return false;
  return model.hasAspectRatioFrame && model.aspectRatio > 0;
}

/**
 * Minimum expected rendered height (px) for a media block at a given container width.
 *
 * @param model - Resolved media layout model.
 * @param containerWidthPx - Available width on the canvas.
 * @returns Expected height in pixels (0 when layout would collapse).
 */
export function estimateMediaBlockHeightPx(
  model: MediaBlockLayoutModel,
  containerWidthPx: number,
): number {
  if (model.fillSlide || !(model.aspectRatio > 0) || containerWidthPx <= 0) {
    return 0;
  }
  return Math.round(containerWidthPx / model.aspectRatio);
}

/** Default video block props used on the Puck canvas. */
export const NEXUS_VIDEO_DEFAULT_LAYOUT = {
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  aspectRatioPreset: MEDIA_ASPECT_RATIO_DEFAULTS.preset,
  aspectRatioCustom: MEDIA_ASPECT_RATIO_DEFAULTS.custom,
  carouselFill: "auto" as CarouselMediaFillMode,
};

/** Default image block carousel fill (matches {@link NexusImage} defaultProps). */
export const NEXUS_IMAGE_DEFAULT_CAROUSEL_FILL: CarouselMediaFillMode = "auto";

/**
 * Registry entry describing default page-root visibility for a Puck block type.
 */
export interface PuckBlockVisibilitySpec {
  /** Puck component registry key. */
  blockType: string;
  /** Evaluate default page-root visibility. */
  evaluate: () => BlockPageVisibility;
}

/**
 * Whether a string prop contains visible text after trim.
 *
 * @param value - Raw string prop.
 * @returns True when non-empty text is present.
 */
export function hasVisibleText(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

/**
 * Whether an array prop has at least one item with visible label or body text.
 *
 * @param items - Array of objects with optional text fields.
 * @param textKeys - Keys to check on each item.
 * @returns True when at least one item has visible content.
 */
export function hasVisibleListItems(
  items: ReadonlyArray<Record<string, unknown>> | undefined,
  textKeys: readonly string[],
): boolean {
  if (!items?.length) return false;
  return items.some((item) =>
    textKeys.some((key) => {
      const val = item[key];
      return typeof val === "string" && val.trim().length > 0;
    }),
  );
}

/**
 * Build a visibility verdict for text-bearing blocks with default copy.
 *
 * @param blockType - Puck registry key.
 * @param text - Default text prop value.
 * @returns Page visibility result.
 */
export function textBlockPageVisibility(
  blockType: string,
  text: string,
): BlockPageVisibility {
  const visible = hasVisibleText(text);
  return {
    blockType,
    visibleOnPageRoot: visible,
    reason: visible ? undefined : "default text is empty",
  };
}

/**
 * All Puck block types with default page-root visibility checks.
 *
 * Container blocks (Section, Grid, Tabs, Carousel) are visible via min-height CSS
 * even when empty; leaf blocks must ship default content or intrinsic dimensions.
 */
export const PUCK_BLOCK_VISIBILITY_REGISTRY: readonly PuckBlockVisibilitySpec[] = [
  {
    blockType: "NexusVideo",
    evaluate: () => {
      const model = resolveVideoBlockLayoutModel(NEXUS_VIDEO_DEFAULT_LAYOUT, "pageRoot");
      const visible = isMediaBlockVisibleOnPage(model, "pageRoot");
      const height = estimateMediaBlockHeightPx(model, 960);
      return {
        blockType: "NexusVideo",
        visibleOnPageRoot: visible && height > 0,
        reason:
          visible && height > 0
            ? undefined
            : "video fill-slide or missing aspect-ratio frame collapses on page root",
      };
    },
  },
  {
    blockType: "NexusImage",
    evaluate: () => {
      const model = resolveImageBlockLayoutModel(
        {
          aspectRatioPreset: MEDIA_ASPECT_RATIO_DEFAULTS.preset,
          aspectRatioCustom: MEDIA_ASPECT_RATIO_DEFAULTS.custom,
          carouselFill: NEXUS_IMAGE_DEFAULT_CAROUSEL_FILL,
        },
        "pageRoot",
      );
      const visible = isMediaBlockVisibleOnPage(model, "pageRoot");
      return {
        blockType: "NexusImage",
        visibleOnPageRoot: visible,
        reason: visible ? undefined : "image fill-slide collapses on page root",
      };
    },
  },
  {
    blockType: "NexusHeading",
    evaluate: () => textBlockPageVisibility("NexusHeading", "Heading Title"),
  },
  {
    blockType: "NexusText",
    evaluate: () =>
      textBlockPageVisibility(
        "NexusText",
        "<p>This is a paragraph of body text. You can edit this text inline or in the sidebar.</p>",
      ),
  },
  {
    blockType: "NexusQuote",
    evaluate: () =>
      textBlockPageVisibility("NexusQuote", "The best way to predict the future is to invent it."),
  },
  {
    blockType: "NexusButton",
    evaluate: () => textBlockPageVisibility("NexusButton", "Action"),
  },
  {
    blockType: "NexusInput",
    evaluate: () => textBlockPageVisibility("NexusInput", "Full Name"),
  },
  {
    blockType: "NexusList",
    evaluate: () => ({
      blockType: "NexusList",
      visibleOnPageRoot: true,
      reason: undefined,
    }),
  },
  {
    blockType: "NexusAccordion",
    evaluate: () => ({
      blockType: "NexusAccordion",
      visibleOnPageRoot: hasVisibleListItems(
        [
          { title: "How do I join the Student Council?", content: "Apply during registration." },
        ],
        ["title", "content"],
      ),
    }),
  },
  {
    blockType: "NexusNewsCard",
    evaluate: () =>
      textBlockPageVisibility("NexusNewsCard", "Council budget approved for spring events"),
  },
  {
    blockType: "NexusUserBadge",
    evaluate: () => textBlockPageVisibility("NexusUserBadge", "Anna Koval"),
  },
  {
    blockType: "NexusStatCard",
    evaluate: () => textBlockPageVisibility("NexusStatCard", "128"),
  },
  {
    blockType: "NexusAvatar",
    evaluate: () => textBlockPageVisibility("NexusAvatar", "User"),
  },
  {
    blockType: "NexusSpacer",
    evaluate: () => ({
      blockType: "NexusSpacer",
      visibleOnPageRoot: true,
      reason: undefined,
    }),
  },
  {
    blockType: "NexusSection",
    evaluate: () => ({ blockType: "NexusSection", visibleOnPageRoot: true }),
  },
  {
    blockType: "NexusGrid",
    evaluate: () => ({ blockType: "NexusGrid", visibleOnPageRoot: true }),
  },
  {
    blockType: "NexusTabs",
    evaluate: () => ({ blockType: "NexusTabs", visibleOnPageRoot: true }),
  },
  {
    blockType: "NexusCarousel",
    evaluate: () => ({ blockType: "NexusCarousel", visibleOnPageRoot: true }),
  },
];

/**
 * Run all registered block visibility checks.
 *
 * @returns Visibility verdict for every Puck block type in the registry.
 */
export function evaluateAllBlockPageVisibility(): BlockPageVisibility[] {
  return PUCK_BLOCK_VISIBILITY_REGISTRY.map((spec) => spec.evaluate());
}

/**
 * Assert every registered block is visible on the page root with default props.
 *
 * @returns Blocks that would collapse or render empty on the canvas.
 */
export function findInvisibleBlocksOnPageRoot(): BlockPageVisibility[] {
  return evaluateAllBlockPageVisibility().filter((result) => !result.visibleOnPageRoot);
}
