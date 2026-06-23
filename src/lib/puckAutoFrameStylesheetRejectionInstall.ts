/**
 * @fileoverview Side-effect entry that suppresses Puck AutoFrame stylesheet rejections.
 *
 * Import this module before `@puckeditor/core` in Puck editor bundles so the
 * `unhandledrejection` listener is registered before AutoFrame clones host stylesheets.
 *
 * @module src/lib/puckAutoFrameStylesheetRejectionInstall
 */

import { installPuckAutoFrameStylesheetRejectionGuard } from "@/components/puck/PuckAutoFrameStylesheetRejectionGuard";

installPuckAutoFrameStylesheetRejectionGuard();
