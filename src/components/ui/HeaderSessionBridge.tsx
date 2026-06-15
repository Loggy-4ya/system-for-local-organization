/**
 * @fileoverview Server component bridging Auth.js session into GlobalHeader props.
 *
 * @module src/components/ui/HeaderSessionBridge
 */

import { auth } from "@/auth";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { resolveStoredThemeIsDark } from "@/lib/resolveStoredThemeIsDark";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";

/**
 * Renders GlobalHeader with live session data from Auth.js.
 *
 * @returns Header with avatar and admin panel visibility from session.
 */
export async function HeaderSessionBridge() {
  const session = await auth();
  const user = session?.user;
  const isDarkTheme = await resolveStoredThemeIsDark("dark");

  const showAdminPanel =
    user?.role === "Admin" || user?.role === "StudentCouncil";

  // Fetch Global Layout settings server-side
  const doc = await GlobalLayoutDomain.loadOrSeed();
  const config = GlobalLayoutDomain.toPublicConfig(doc);

  return (
    <GlobalHeader
      header={config.header}
      showAdminPanel={showAdminPanel}
      isDarkTheme={isDarkTheme}
      userAvatar={user?.avatar ?? null}
      isAuthenticated={Boolean(user?.id)}
      userName={user?.name ?? null}
      userEmail={user?.email ?? null}
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
    />
  );
}

export default HeaderSessionBridge;
