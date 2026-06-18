"use client";

/**
 * @fileoverview Per-block sidebar field chapter layouts for Content and Layout Puck components.
 *
 * @module src/components/puck/lib/blockFieldChapterConfigs
 */

import {
  Film,
  LayoutGrid,
  Link2,
  MousePointerClick,
  Palette,
  Play,
  Rows3,
  Settings2,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import { puckIcon } from "./puckIcons";
import type { BlockFieldChapterConfig } from "./blockFieldChapters";

/** Chapter icon helpers. */
const ContentIcon = () => puckIcon(Type);
const TypographyIcon = () => puckIcon(Type);
const LayoutIcon = () => puckIcon(LayoutGrid);
const AppearanceIcon = () => puckIcon(Palette);
const MediaIcon = () => puckIcon(Film);
const PlaybackIcon = () => puckIcon(Play);
const BehaviorIcon = () => puckIcon(Settings2);
const StyleIcon = () => puckIcon(SlidersHorizontal);
const LinkIcon = () => puckIcon(Link2);
const SizeIcon = () => puckIcon(Rows3);
const DividerIcon = () => puckIcon(Rows3);
const ValidationIcon = () => puckIcon(MousePointerClick);
const SourceIcon = () => puckIcon(Film);

/** Sidebar chapter configs keyed by Puck component type. */
export const BLOCK_FIELD_CHAPTER_CONFIGS: Record<string, BlockFieldChapterConfig> = {
  /* ── Layout ─────────────────────────────────────────────────────────────── */

  NexusSection: {
    topLevelFieldKeys: ["content"],
    chapters: [
      {
        id: "sectionLayout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["maxWidth", "padding"],
      },
      {
        id: "sectionAppearance",
        title: "Appearance",
        icon: <AppearanceIcon />,
        fieldKeys: ["backgroundOverride", "textColor", "borderTop", "borderBottom"],
      },
    ],
  },

  NexusGrid: {
    topLevelFieldKeys: ["items"],
    chapters: [
      {
        id: "gridLayout",
        title: "Layout",
        icon: <LayoutIcon />,
        defaultOpen: true,
        fieldKeys: ["columns", "gap"],
      },
    ],
  },

  NexusSpacer: {
    topLevelFieldKeys: ["stylePreset"],
    chapters: [
      {
        id: "spacerSize",
        title: "Size",
        icon: <SizeIcon />,
        visibleWhenFlat: (props) => props.stylePreset === "custom",
        fieldKeys: ["height"],
      },
      {
        id: "lineAppearance",
        title: "Line",
        icon: <DividerIcon />,
        visibleWhenFlat: (props) => props.stylePreset === "custom",
        fieldKeys: ["showLine", "thickness", "borderColorPreset", "width", "align"],
        visibleWhen: {
          thickness: (v) => v.showLine === "yes",
          borderColorPreset: (v) => v.showLine === "yes",
          width: (v) => v.showLine === "yes",
          align: (v) => v.showLine === "yes",
        },
      },
    ],
  },

  /* ── Content ────────────────────────────────────────────────────────────── */

  NexusHeading: {
    chapters: [
      {
        id: "headingContent",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text", "level"],
      },
      {
        id: "headingTypography",
        title: "Typography",
        icon: <TypographyIcon />,
        fieldKeys: ["colorPreset", "fontFamily", "fontWeight"],
      },
      {
        id: "headingLayout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["align"],
      },
    ],
  },

  NexusText: {
    chapters: [
      {
        id: "textContent",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text"],
      },
      {
        id: "textTypography",
        title: "Typography",
        icon: <TypographyIcon />,
        fieldKeys: ["align", "colorPreset", "fontFamily", "fontWeight", "fontSize", "lineHeight"],
      },
    ],
  },

  NexusImage: {
    chapters: [
      {
        id: "imageMedia",
        title: "Media",
        icon: <MediaIcon />,
        fieldKeys: ["image", "alt"],
      },
      {
        id: "imageLayout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["width", "height", "aspectRatio", "align", "carouselFill", "mediaFit"],
      },
      {
        id: "imageAppearance",
        title: "Appearance",
        icon: <AppearanceIcon />,
        fieldKeys: ["borderRadius", "shadowDepth"],
      },
    ],
  },

  NexusQuote: {
    chapters: [
      {
        id: "quoteContent",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text", "author"],
      },
      {
        id: "quoteTypography",
        title: "Typography",
        icon: <TypographyIcon />,
        fieldKeys: ["fontFamily", "fontWeight"],
      },
      {
        id: "quoteAppearance",
        title: "Appearance",
        icon: <AppearanceIcon />,
        fieldKeys: ["borderColor"],
      },
    ],
  },

  NexusVideo: {
    chapters: [
      {
        id: "videoSource",
        title: "Source",
        icon: <SourceIcon />,
        fieldKeys: ["url"],
      },
      {
        id: "videoLayout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["aspectRatio", "width", "maxWidth", "align"],
      },
      {
        id: "videoPlayback",
        title: "Playback",
        icon: <PlaybackIcon />,
        fieldKeys: ["autoplay", "controls"],
      },
    ],
  },

  NexusAccordion: {
    topLevelFieldKeys: ["items"],
    chapters: [
      {
        id: "accordionBehavior",
        title: "Behavior",
        icon: <BehaviorIcon />,
        fieldKeys: ["allowMultiple"],
      },
    ],
  },

  NexusList: {
    topLevelFieldKeys: ["items"],
    chapters: [
      {
        id: "listStyle",
        title: "Style",
        icon: <StyleIcon />,
        fieldKeys: ["listType", "itemSpacing"],
      },
    ],
  },

  NexusButton: {
    chapters: [
      {
        id: "buttonContent",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["label"],
      },
      {
        id: "buttonStyle",
        title: "Style",
        icon: <StyleIcon />,
        fieldKeys: ["variant", "size", "fullWidth", "borderRadius", "icon", "iconPosition"],
      },
      {
        id: "buttonLink",
        title: "Link",
        icon: <LinkIcon />,
        fieldKeys: ["href"],
      },
    ],
  },

  NexusTabs: {
    topLevelFieldKeys: ["tabs", "editorActiveIndex"],
    chapters: [
      {
        id: "tabsBehavior",
        title: "Behavior",
        icon: <BehaviorIcon />,
        fieldKeys: ["defaultActiveIndex", "align", "size", "accentColor"],
      },
    ],
  },

  NexusCarousel: {
    topLevelFieldKeys: ["slides", "editorActiveIndex"],
    chapters: [
      {
        id: "carouselSizeGroup",
        title: "Size",
        icon: <SizeIcon />,
        fieldKeys: ["carouselSize"],
      },
      {
        id: "carouselBehavior",
        title: "Behavior",
        icon: <BehaviorIcon />,
        fieldKeys: [
          "autoplay",
          "intervalSeconds",
          "showArrows",
          "showDots",
          "slidesPerView",
          "scrollStep",
        ],
      },
    ],
  },

  NexusInput: {
    chapters: [
      {
        id: "inputContent",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["label", "placeholder", "helperText"],
      },
      {
        id: "inputValidation",
        title: "Validation",
        icon: <ValidationIcon />,
        fieldKeys: ["type", "required"],
      },
    ],
  },
};

export default BLOCK_FIELD_CHAPTER_CONFIGS;
