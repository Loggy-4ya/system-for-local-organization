"use client";

/**
 * @fileoverview Live preview panel for global layout settings.
 *
 * Renders header and footer inside a viewport frame (phone / tablet / desktop)
 * so responsive chrome matches the selected breakpoint — not the browser window.
 * Page content uses the same max-width band as site chrome ({@link GLOBAL_LAYOUT_CONTENT_WIDTH}).
 *
 * @module src/components/global-layout/ChromePreviewPanel
 */

import React, { useEffect, useRef, useState } from "react";
import { Eye, Monitor, Smartphone, Tablet } from "lucide-react";
import { SiteHeaderBar } from "@/components/ui/SiteHeaderBar";
import { SiteFooterBar } from "@/components/ui/SiteFooterBar";
import { type HeaderConfig, type FooterConfig } from "@shared/constants/globalLayout";
import {
  contentWidthContainerStyle,
  GLOBAL_LAYOUT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_WIDTH_BAND_CLASS,
} from "@/components/puck/lib/contentWidthTokens";
import { useGlobalLayoutPreviewScroll } from "@/components/global-layout/lib/useGlobalLayoutPreviewScroll";

/** Preview breakpoint presets. */
export type PreviewViewport = "phone" | "tablet" | "desktop";

interface ChromePreviewPanelProps {
  header: HeaderConfig;
  footer: FooterConfig;
  isDarkTheme?: boolean;
  activeTab?: "header" | "footer";
}

const VIEWPORT_OPTIONS: {
  id: PreviewViewport;
  label: string;
  hint: string;
  width: string;
  Icon: typeof Smartphone;
}[] = [
  {
    id: "phone",
    label: "Phone",
    hint: "390px — mobile header, burger menu",
    width: "390px",
    Icon: Smartphone,
  },
  {
    id: "tablet",
    label: "Tablet",
    hint: "768px — mobile header, wider frame",
    width: "768px",
    Icon: Tablet,
  },
  {
    id: "desktop",
    label: "Desktop",
    hint: "Full width — top nav and desktop footer",
    width: "100%",
    Icon: Monitor,
  },
];

/**
 * Live preview with viewport switcher — header/footer render like production chrome.
 *
 * @param props - Header/footer config and active editor tab for scroll focus.
 * @returns Preview panel JSX.
 */
export function ChromePreviewPanel({
  header,
  footer,
  isDarkTheme = true,
  activeTab = "header",
}: ChromePreviewPanelProps) {
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);

  useGlobalLayoutPreviewScroll(scrollContainerRef, previewFrameRef);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (activeTab === "footer") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  const viewportMeta = VIEWPORT_OPTIONS.find((option) => option.id === viewport)!;
  const chromeBandStyle = contentWidthContainerStyle(GLOBAL_LAYOUT_CONTENT_WIDTH);
  const pageBandStyle = contentWidthContainerStyle(GLOBAL_LAYOUT_CONTENT_WIDTH);

  return (
    <div className="global-layout-preview flex w-full flex-col">
      <div className="global-layout-preview__toolbar flex flex-col gap-3 border-b border-(--color-border-default) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Eye size={15} className="shrink-0 text-(--color-accent-user)" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-text-primary)">
            Live Preview
          </h2>
        </div>

        <div
          className="global-layout-preview__viewport-toggle"
          role="group"
          aria-label="Preview viewport"
        >
          {VIEWPORT_OPTIONS.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={viewport === id}
              aria-label={`${label}: ${hint}`}
              title={hint}
              data-tooltip={hint}
              className="global-layout-preview__viewport-btn"
              onClick={() => setViewport(id)}
            >
              <Icon size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollContainerRef} className="global-layout-preview__canvas">
        <div
          ref={previewFrameRef}
          className="global-layout-preview-frame"
          data-viewport={viewport}
          style={{
            width: viewportMeta.width,
            maxWidth: "100%",
          }}
        >
          <div className="global-layout-preview-frame__site">
            <div className="global-layout-preview-frame__header-slot">
              <div className={GLOBAL_LAYOUT_WIDTH_BAND_CLASS} style={chromeBandStyle}>
                <SiteHeaderBar
                  categories={header.categories}
                  layout={header.layout}
                  contentWidth="full"
                  showAdminPanel={true}
                  isDarkTheme={isDarkTheme}
                  isAuthenticated={true}
                  userName="Starosta"
                  userEmail="starosta@nexus.edu"
                  preview
                />
              </div>
            </div>

            <div className="global-layout-preview-frame__content-slot">
              <div
                className={`${GLOBAL_LAYOUT_WIDTH_BAND_CLASS} global-layout-preview-frame__content`}
                style={pageBandStyle}
              >
                <h3 className="global-layout-preview-frame__content-title">Mock Page Content</h3>
                <p className="global-layout-preview-frame__content-copy">
                  Header, footer, and mock page content use the site chrome band (1400px max).
                </p>
              </div>
            </div>

            <div className="global-layout-preview-frame__footer-slot">
              <div className={GLOBAL_LAYOUT_WIDTH_BAND_CLASS} style={chromeBandStyle}>
                <SiteFooterBar footer={footer} contentWidth="full" preview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChromePreviewPanel;
