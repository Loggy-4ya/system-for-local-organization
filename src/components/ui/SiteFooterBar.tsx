"use client";

/**
 * @fileoverview Shared responsive site footer bar.
 *
 * Renders responsive columns of links, social media icons,
 * student council mention, and copyright text inside a glass panel.
 *
 * @module src/components/ui/SiteFooterBar
 */

import React from "react";
import Link from "next/link";
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { type FooterConfig, DEFAULT_FOOTER_LAYOUT } from "@shared/constants/globalLayout";
import { contentWidthContainerStyle, GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Resolves the CSS variable style for footer link column count.
 *
 * @param footer - Footer configuration.
 * @returns Inline style for `--site-footer-link-columns`.
 */
function footerGridStyle(footer: FooterConfig): React.CSSProperties {
  const columns = footer.layout?.columns ?? DEFAULT_FOOTER_LAYOUT.columns;
  return { "--site-footer-link-columns": String(columns) } as React.CSSProperties;
}

/** Props for {@link SiteFooterBar}. */
export interface SiteFooterBarProps {
  /** Configurable footer settings. */
  footer: FooterConfig;
  /** Content width preset. */
  contentWidth?: string;
  /** Disable pointer events (editor preview). */
  preview?: boolean;
}

/**
 * Responsive glass footer bar — displays sections, social links, and copyright.
 *
 * @param props - See {@link SiteFooterBarProps}.
 * @returns Footer bar JSX.
 */
export function SiteFooterBar({ footer, contentWidth = GLOBAL_LAYOUT_CONTENT_WIDTH, preview = false }: SiteFooterBarProps) {
  const { sections = [], socialLinks = [], mention, copyright } = footer;
  const widthStyle = contentWidthContainerStyle(contentWidth);
  const gridStyle = footerGridStyle(footer);

  return (
    <div 
      className="site-footer-bar-root relative mx-auto w-full pb-12"
      style={widthStyle}
    >
      <div
        className="site-footer-bar glass-panel w-full rounded-(--radius-lg) p-6 md:p-8 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]"
        style={{ pointerEvents: preview ? "none" : undefined }}
      >
        <div
          className="site-footer-bar__grid"
          style={gridStyle}
        >
          {/* Brand & Mention Column */}
          <div className="site-footer-bar__brand flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-(--color-text-primary) tracking-wide">
                NEXUS
              </span>
            </div>
            {mention && (
              <p className="text-xs text-(--color-text-secondary) max-w-xs leading-relaxed">
                {mention}
              </p>
            )}
            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                {socialLinks.map((social) => (
                  <Link
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors duration-150 p-1.5 rounded-md hover:bg-zinc-700/20 dark:hover:bg-zinc-300/10"
                    aria-label={social.label}
                    title={social.label}
                  >
                    <span className="site-footer-bar__social-icon" aria-hidden>
                      {resolveLucideIcon(social.icon, siteChromeLucideProps())}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Links Columns */}
          {sections.map((section) => (
            <div key={section.id} className="site-footer-bar__column flex flex-col gap-3">
              {section.title && (
                <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-text-secondary) opacity-80">
                  {section.title}
                </h3>
              )}
              <ul className="m-0 flex flex-col gap-2 list-none p-0">
                {section.links.map((link) => {
                  const isExternal = link.external;
                  return (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) no-underline transition-colors duration-150"
                      >
                        {link.label}
                        {isExternal && (
                          <span className="inline-block ml-1 text-[10px] opacity-60">↗</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright Footer Divider */}
        {(copyright || mention) && (
          <div className="border-t border-(--color-border-default) mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {copyright && (
              <p className="text-[11px] text-(--color-text-secondary) opacity-60 m-0">
                {copyright}
              </p>
            )}
            <p className="text-[11px] text-(--color-text-secondary) opacity-40 m-0 hidden sm:block">
              Institutional Management Platform
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SiteFooterBar;
