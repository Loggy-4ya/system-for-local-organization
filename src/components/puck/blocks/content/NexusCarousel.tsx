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
import { StripArrayLabelField } from "../../fields/StripArrayLabelField";

/** Default empty slide with slot array for Puck inline data model. */
const emptySlide = { label: "New Slide", content: [] as never[] };

/** Props passed to carousel render after size normalization. */
interface CarouselRenderProps {
  id?: string;
  slides: typeof emptySlide[];
  carouselSize?: CarouselSizeSettings;
  height?: string;
  heightCustom?: string;
  borderRadius?: string;
  borderRadiusCustom?: string;
  autoplay: "off" | "on";
  intervalSeconds: number;
  showArrows: "yes" | "no";
  showDots: "yes" | "no";
  slidesPerView: "auto" | "1" | "2" | "3";
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
      getItemSummary: (item: { label?: string }) => item.label || "Slide",
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Slide Label",
          render: StripArrayLabelField as never,
        },
        content: {
          type: "slot" as const,
          label: "Slide Content",
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
    slidesPerView: {
      type: "radio" as const,
      label: "Slides Visible",
      options: [
        { label: "Auto (responsive)", value: "auto" },
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
      ],
    },
    editorActiveIndex: {
      type: "number" as const,
      label: "Editor Active Slide",
      min: 0,
      visible: false,
    },
  },
  defaultProps: {
    slides: [
      { label: "First slide", content: [] },
      { label: "Second slide", content: [] },
    ],
    carouselSize: {
      height: "auto" as const,
      heightCustom: "360px",
      borderRadius: "var(--radius-md)" as const,
      borderRadiusCustom: "var(--radius-md)",
    },
    autoplay: "off" as const,
    intervalSeconds: 5,
    showArrows: "yes" as const,
    showDots: "yes" as const,
    slidesPerView: "auto" as const,
    editorActiveIndex: 0,
  },
  resolveData: (
    { props }: { props: CarouselRenderProps },
    params: {
      changed: Partial<Record<keyof CarouselRenderProps, boolean>>;
      trigger: "insert" | "replace" | "load" | "move" | "force";
    },
  ) => {
    const shouldNormalize =
      params.trigger === "load" ||
      params.trigger === "insert" ||
      params.changed.carouselSize ||
      params.changed.height ||
      params.changed.heightCustom ||
      params.changed.borderRadius ||
      params.changed.borderRadiusCustom;

    if (!shouldNormalize) {
      return { props };
    }

    return {
      props: {
        ...props,
        carouselSize: resolveSizeProps(props),
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
        editorActiveIndex={props.editorActiveIndex}
        puck={props.puck}
        height={size.height}
        heightCustom={size.heightCustom}
        borderRadius={size.borderRadius}
        borderRadiusCustom={size.borderRadiusCustom}
      />
    );
  },
};

export default NexusCarousel;
