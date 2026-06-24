/**
 * @fileoverview Side-effect entry that registers the DOM event rejection guard.
 *
 * Import from a root client host so the listener exists before Puck and page bundles
 * attach resource loaders that may reject with raw `Event` objects.
 *
 * @module src/lib/domEventRejectionGuardInstall
 */

import { installDomEventRejectionGuard } from "@/lib/domEventRejectionGuardScript";

installDomEventRejectionGuard();
