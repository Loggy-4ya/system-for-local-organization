/**
 * @fileoverview Server component bridging Auth.js session into GlobalHeader props.
 *
 * @module src/components/ui/HeaderSessionBridge
 */

import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { resolveStoredThemeIsDark } from "@/lib/resolveStoredThemeIsDark";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";

/**
 * Renders GlobalHeader with global layout config and SSR theme resolution.
 *
 * Authenticated viewer fields are supplied by {@link SiteProfileProvider}
 * after entry bootstrap via `GET /api/me`.
 *
 * @returns Header wired to MongoDB global layout settings.
 */
export async function HeaderSessionBridge() {
  const isDarkTheme = await resolveStoredThemeIsDark("dark");

  const doc = await GlobalLayoutDomain.loadOrSeed();
  const config = GlobalLayoutDomain.toPublicConfig(doc);

  return (
    <GlobalHeader
      header={config.header}
      isDarkTheme={isDarkTheme}
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
    />
  );
}

export default HeaderSessionBridge;
