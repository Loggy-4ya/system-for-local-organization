"use client";

/**
 * @fileoverview Root client host for the DOM event rejection guard.
 *
 * @module src/components/navigation/DomEventRejectionGuardHost
 */

import "@/lib/domEventRejectionGuardInstall";

/**
 * Ensures {@link installDomEventRejectionGuard} runs for every app route.
 *
 * @returns Null — side effects only.
 */
export function DomEventRejectionGuardHost() {
  return null;
}

export default DomEventRejectionGuardHost;
