"use client";

/**
 * @fileoverview Per-block sidebar field chapter layouts for Content and Layout Puck components.
 *
 * Chapter {@link BlockFieldChapter.titleKey} values resolve under `puck.chapters` at render time;
 * {@link BlockFieldChapter.title} remains the English fallback for tests and non-React contexts.
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
        titleKey: "layout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["maxWidth", "padding"],
      },
      {
        id: "sectionAppearance",
        titleKey: "appearance",
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
        titleKey: "layout",
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
        titleKey: "size",
        title: "Size",
        icon: <SizeIcon />,
        visibleWhenFlat: (props) => props.stylePreset === "custom",
        fieldKeys: ["height"],
      },
      {
        id: "lineAppearance",
        titleKey: "line",
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
        titleKey: "content",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text", "level"],
      },
      {
        id: "headingTypography",
        titleKey: "typography",
        title: "Typography",
        icon: <TypographyIcon />,
        fieldKeys: ["colorPreset", "fontFamily", "fontWeight"],
      },
      {
        id: "headingLayout",
        titleKey: "layout",
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
        titleKey: "content",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text"],
      },
      {
        id: "textTypography",
        titleKey: "typography",
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
        titleKey: "media",
        title: "Media",
        icon: <MediaIcon />,
        fieldKeys: ["image", "alt"],
      },
      {
        id: "imageLayout",
        titleKey: "layout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["width", "height", "aspectRatio", "align", "carouselFill", "mediaFit"],
      },
      {
        id: "imageAppearance",
        titleKey: "appearance",
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
        titleKey: "content",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["text", "author"],
      },
      {
        id: "quoteTypography",
        titleKey: "typography",
        title: "Typography",
        icon: <TypographyIcon />,
        fieldKeys: ["fontFamily", "fontWeight"],
      },
      {
        id: "quoteAppearance",
        titleKey: "appearance",
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
        titleKey: "source",
        title: "Source",
        icon: <SourceIcon />,
        fieldKeys: ["url"],
      },
      {
        id: "videoLayout",
        titleKey: "layout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["aspectRatio", "width", "maxWidth", "align"],
      },
      {
        id: "videoPlayback",
        titleKey: "playback",
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
        titleKey: "accordionOptions",
        title: "Accordion Options",
        icon: <BehaviorIcon />,
        fieldKeys: ["allowMultiple"],
      },
    ],
  },

  NexusList: {
    topLevelFieldKeys: ["items"],
    chapters: [
      {
        id: "listBehavior",
        titleKey: "stepDefaults",
        title: "Step Defaults",
        icon: <BehaviorIcon />,
        fieldKeys: ["defaultExpandNested"],
      },
      {
        id: "listStyle",
        titleKey: "listStyle",
        title: "List Style",
        icon: <StyleIcon />,
        fieldKeys: ["connectorStyle", "itemSpacing"],
      },
    ],
  },

  NexusTabs: {
    topLevelFieldKeys: ["tabs", "editorActiveIndex"],
    chapters: [
      {
        id: "tabsBehavior",
        titleKey: "tabOptions",
        title: "Tab Options",
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
        titleKey: "carouselSize",
        title: "Carousel Size",
        icon: <SizeIcon />,
        fieldKeys: ["carouselSize"],
      },
      {
        id: "carouselBehavior",
        titleKey: "carouselPlayback",
        title: "Carousel Playback",
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
        titleKey: "content",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["question", "mode", "helperText"],
      },
      {
        id: "inputOptions",
        titleKey: "options",
        title: "Options",
        icon: <ContentIcon />,
        fieldKeys: ["options"],
        visibleWhenFlat: (props) => props.mode === "choice",
      },
      {
        id: "inputTextSettings",
        titleKey: "textAnswer",
        title: "Text Answer",
        icon: <ContentIcon />,
        fieldKeys: ["placeholder", "inputType"],
        visibleWhenFlat: (props) => props.mode !== "choice",
      },
      {
        id: "inputValidation",
        titleKey: "validation",
        title: "Validation",
        icon: <ValidationIcon />,
        fieldKeys: ["required"],
      },
      {
        id: "inputQuizGrading",
        titleKey: "quizGrading",
        title: "Quiz Grading",
        icon: <ValidationIcon />,
        fieldKeys: ["answerMode"],
        visibleWhenFlat: (props) => props.mode === "choice",
      },
      {
        id: "inputDistribution",
        titleKey: "distribution",
        title: "Distribution",
        icon: <LinkIcon />,
        fieldKeys: ["distribution"],
      },
      {
        id: "inputStatistics",
        titleKey: "statistics",
        title: "Statistics",
        icon: <BehaviorIcon />,
        fieldKeys: ["statsPanel"],
        defaultOpen: false,
      },
    ],
  },

  NexusComments: {
    chapters: [
      {
        id: "commentsContent",
        titleKey: "content",
        title: "Content",
        icon: <ContentIcon />,
        fieldKeys: ["launcherLabel", "viewMode"],
      },
      {
        id: "commentsBehavior",
        titleKey: "behavior",
        title: "Behavior",
        icon: <BehaviorIcon />,
        fieldKeys: ["commentsEnabled"],
      },
      {
        id: "commentsLayout",
        titleKey: "layout",
        title: "Layout",
        icon: <LayoutIcon />,
        fieldKeys: ["layoutWidth", "layoutAlign", "previewIntervalSeconds"],
      },
    ],
  },
};

export default BLOCK_FIELD_CHAPTER_CONFIGS;
