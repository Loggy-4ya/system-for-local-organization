"use client";

/**
 * @fileoverview Injects locale-layout bootstrap inline scripts outside the React render tree.
 *
 * React 19 / Next.js 16 warn (and do not execute) raw `<script>` or `next/script` nodes
 * when they appear as children of a hydrating/client-reconciled layout. Streaming via
 * {@link useServerInsertedHTML} keeps FOUC/theme + early guards in the SSR HTML without
 * putting `<script>` in the component's render output.
 *
 * @module src/components/navigation/BootstrapInlineScriptsHost
 */

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

/** Props for {@link BootstrapInlineScriptsHost}. */
export interface BootstrapInlineScriptsHostProps {
  /** Optional CSP nonce from middleware (`x-nonce`). */
  cspNonce?: string;
  /** Inline source for the DOM Event rejection guard. */
  domEventGuardScript: string;
  /** Inline source for the `window.ethereum` stub shim. */
  walletProviderShim: string;
  /** Inline theme init script from `@teispace/next-themes/server`. */
  themeScript: string;
}

/**
 * Stream early-running bootstrap scripts into the SSR HTML once per request.
 *
 * @param props - Nonce and inline script sources from the locale layout.
 * @returns Null — scripts are inserted via {@link useServerInsertedHTML} only.
 */
export function BootstrapInlineScriptsHost({
  cspNonce,
  domEventGuardScript,
  walletProviderShim,
  themeScript,
}: BootstrapInlineScriptsHostProps) {
  const insertedRef = useRef(false);

  useServerInsertedHTML(() => {
    if (insertedRef.current) {
      return null;
    }

    insertedRef.current = true;

    return (
      <>
        <script
          id="nexus-dom-event-rejection-guard"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: domEventGuardScript }}
        />
        <script
          id="nexus-wallet-shim"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: walletProviderShim }}
        />
        <script
          id="nexus-theme-init"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </>
    );
  });

  return null;
}

export default BootstrapInlineScriptsHost;
