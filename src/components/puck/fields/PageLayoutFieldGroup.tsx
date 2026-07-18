"use client";

/**
 * @fileoverview Page content-width controls for PageRoot sidebar.
 *
 * @module src/components/puck/fields/PageLayoutFieldGroup
 */

import { FieldChapter } from "./FieldChapter";
import { PuckSelectField } from "./PuckSelectField";
import { useTranslations } from "next-intl";
import {
  clampPageContentWidth,
  DEFAULT_CONTENT_WIDTH,
  PAGE_CONTENT_WIDTH_OPTIONS,
  type ContentWidthToken,
} from "../lib/contentWidthTokens";
import { Rows3 } from "lucide-react";
import { puckIcon } from "../lib/puckIcons";

/** Layout props stored under root `pageLayout.contentWidth`. */
export interface PageLayoutProps {
  /** Max width token for page content. */
  contentWidth?: ContentWidthToken;
}

/** Puck custom field props for page layout. */
interface PageLayoutFieldGroupProps {
  value: PageLayoutProps;
  onChange: (value: PageLayoutProps) => void;
}

/**
 * Page content width chapter in the Puck root sidebar.
 *
 * @param props - Puck custom field props.
 * @returns Layout field chapter UI.
 */
export function PageLayoutFieldGroup({ value, onChange }: PageLayoutFieldGroupProps) {
  const layout = value ?? {};
  const tChapters = useTranslations("puck.pageChapters");
  const tLayout = useTranslations("puck.pageLayout");
  const tWidth = useTranslations("puck.contentWidth");

  return (
    <FieldChapter title={tChapters("pageWidth")} icon={puckIcon(Rows3)}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">{tLayout("contentWidth")}</span>
        <PuckSelectField
          value={clampPageContentWidth(layout.contentWidth ?? DEFAULT_CONTENT_WIDTH)}
          onChange={(next) =>
            onChange({
              contentWidth: clampPageContentWidth(next) as PageLayoutProps["contentWidth"],
            })
          }
          options={PAGE_CONTENT_WIDTH_OPTIONS.map((opt) => ({
            label: tWidth(opt.value),
            value: opt.value,
          }))}
        />
      </div>
    </FieldChapter>
  );
}

export default PageLayoutFieldGroup;
