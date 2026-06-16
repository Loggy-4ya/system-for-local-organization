"use client";

/**
 * @fileoverview Puck block for a content carousel with per-slide drag-and-drop slots.
 *
 * @module src/components/puck/blocks/content/NexusCarousel
 */

import {
  normalizeCarouselSizeSettings,
  type CarouselSizeSettings,
} from "../../fields/CarouselDimensionFields";
import { NexusCarouselRender, type NexusCarouselRenderProps } from "./NexusCarouselRender";
import { CarouselSizeFieldGroup } from "../../fields/CarouselDimensionFields";
import { CarouselSlideLabelField } from "../../fields/CarouselSlideLabelField";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import {
  CAROUSEL_SCROLL_STEP_OPTIONS,
  CAROUSEL_SLIDES_PER_VIEW_OPTIONS,
} from "../../lib/fieldOptionLabels";
import {
  formatCarouselSlideLabel,
  ensureCarouselSlideLabels,
} from "../../lib/carouselSlideLabels";
import { DISALLOW_NEXUS_GRID_ITEM } from "../../lib/nexusGridItemZonePolicy";

/** Default empty slide — label filled by `ensureCarouselSlideLabels` on insert. */
const emptySlide = { label: "", content: [] as never[] };

/** Props passed to carousel render after size normalization. */
interface CarouselRenderProps {
  id?: string;
  slides: typeof emptySlide[];
  carouselSize?: CarouselSizeSettings;
  height?: string;
  heightCustom?: string;
  maxHeight?: string;
  maxHeightCustom?: string;
  borderRadius?: string;
  borderRadiusCustom?: string;
  autoplay: "off" | "on";
  intervalSeconds: number;
  showArrows: "yes" | "no";
  showDots: "yes" | "no";
  slidesPerView: "auto" | "1" | "2" | "3";
  scrollStep?: "1" | "2" | "3" | "page";
  editorActiveIndex?: number;
  puck?: { isEditing?: boolean };
}

/**
 * Resolve flat size props from grouped `carouselSize` or legacy flat fields.
 *
 * @param props - Raw carousel block props.
 * @returns Normalized size settings.
 */
function resolveSizeProps(props: CarouselRenderProps): CarouselSizeSettings {
  if (props.carouselSize) {
    return normalizeCarouselSizeSettings(props.carouselSize);
  }
  return normalizeCarouselSizeSettings({
    height: props.height,
    heightCustom: props.heightCustom,
    borderRadius: props.borderRadius,
    borderRadiusCustom: props.borderRadiusCustom,
  });
}

/**
 * Carousel block — cycles through slides with optional autoplay and controls.
 * Each slide exposes a Puck slot for arbitrary nested blocks.
 */
export const NexusCarousel = {
  label: "Carousel",
  fields: {
    slides: {
      type: "array" as const,
      label: "Slides",
      getItemSummary: (item: { label?: string }, index?: number) =>
        item.label?.trim() || formatCarouselSlideLabel(index ?? 0),
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Slide",
          render: CarouselSlideLabelField as never,
        },
        content: {
          type: "slot" as const,
          label: "Slide Content",
          disallow: [...DISALLOW_NEXUS_GRID_ITEM],
        },
      },
      defaultItemProps: emptySlide,
    },
    carouselSize: {
      type: "custom" as const,
      label: "Carousel Size",
      render: CarouselSizeFieldGroup as never,
    },
    autoplay: {
      type: "radio" as const,
      label: "Autoplay",
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    intervalSeconds: {
      type: "number" as const,
      label: "Autoplay Interval (seconds)",
      min: 2,
      max: 30,
    },
    showArrows: {
      type: "radio" as const,
      label: "Navigation Arrows",
      options: [
        { label: "Show", value: "yes" },
        { label: "Hide", value: "no" },
      ],
    },
    showDots: {
      type: "radio" as const,
      label: "Pagination Dots",
      options: [
        { label: "Show", value: "yes" },
        { label: "Hide", value: "no" },
      ],
    },
    slidesPerView: createSteppedSliderField("Slides Visible", CAROUSEL_SLIDES_PER_VIEW_OPTIONS),
    scrollStep: createSteppedSliderField("Scroll Step", CAROUSEL_SCROLL_STEP_OPTIONS),
    editorActiveIndex: {
      type: "number" as const,
      label: "Editor Active Slide",
      min: 0,
      visible: false,
    },
  },
  defaultProps: {
    slides: [
      { label: formatCarouselSlideLabel(0), content: [] },
      { label: formatCarouselSlideLabel(1), content: [] },
      { label: formatCarouselSlideLabel(2), content: [] },
    ],
    carouselSize: {
      height: "auto" as const,
      heightCustom: "360px",
      maxHeight: "auto" as const,
      maxHeightCustom: "640px",
      borderRadius: "var(--radius-md)" as const,
      borderRadiusCustom: "var(--radius-md)",
    },
    autoplay: "off" as const,
    intervalSeconds: 5,
    showArrows: "yes" as const,
    showDots: "yes" as const,
    slidesPerView: "auto" as const,
    scrollStep: "1" as const,
    editorActiveIndex: 0,
  },
  resolveData: (
    { props }: { props: CarouselRenderProps },
    params: {
      changed: Partial<Record<keyof CarouselRenderProps, boolean>>;
      trigger: "insert" | "replace" | "load" | "move" | "force";
    },
  ) => {
    const shouldEnsureLabels =
      params.trigger === "load" || params.trigger === "insert";

    const slides = shouldEnsureLabels
      ? ensureCarouselSlideLabels(props.slides)
      : props.slides;

    const shouldNormalizeSize =
      params.trigger === "load" || params.trigger === "insert";

    if (!shouldEnsureLabels && !shouldNormalizeSize) {
      return { props };
    }

    return {
      props: {
        ...props,
        slides,
        ...(shouldNormalizeSize
          ? { carouselSize: resolveSizeProps(props) }
          : {}),
      },
    };
  },
  render: (props: CarouselRenderProps) => {
    const size = resolveSizeProps(props);
    return (
      <NexusCarouselRender
        id={props.id}
        slides={props.slides as unknown as NexusCarouselRenderProps["slides"]}
        autoplay={props.autoplay}
        intervalSeconds={props.intervalSeconds}
        showArrows={props.showArrows}
        showDots={props.showDots}
        slidesPerView={props.slidesPerView ?? "auto"}
        scrollStep={props.scrollStep ?? "1"}
        editorActiveIndex={props.editorActiveIndex}
        puck={props.puck}
        height={size.height}
        heightCustom={size.heightCustom}
        maxHeight={size.maxHeight}
        maxHeightCustom={size.maxHeightCustom}
        borderRadius={size.borderRadius}
        borderRadiusCustom={size.borderRadiusCustom}
      />
    );
  },
};

export default NexusCarousel;
