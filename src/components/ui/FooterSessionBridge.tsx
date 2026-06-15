/**
 * @fileoverview Server component bridging global layout config into GlobalFooter props.
 *
 * @module src/components/ui/FooterSessionBridge
 */

import React from "react";
import { GlobalFooter } from "@/components/ui/GlobalFooter";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";

/**
 * Renders GlobalFooter with live configuration from MongoDB.
 *
 * @returns Footer component with custom sections, social links, and copyright.
 */
export async function FooterSessionBridge() {
  // Fetch Global Layout settings server-side
  const doc = await GlobalLayoutDomain.loadOrSeed();
  const config = GlobalLayoutDomain.toPublicConfig(doc);

  return (
    <GlobalFooter footer={config.footer} contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH} />
  );
}

export default FooterSessionBridge;
