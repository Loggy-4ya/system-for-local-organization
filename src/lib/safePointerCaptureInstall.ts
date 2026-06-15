/**
 * @fileoverview Side-effect entry that patches pointer capture before Puck loads.
 *
 * Import this module as the first import in Puck client bundles so
 * {@link installSafePointerCapture} runs before `@puckeditor/core` drag handlers.
 *
 * @module src/lib/safePointerCaptureInstall
 */

import { installSafePointerCapture } from "@/lib/safePointerCapture";

installSafePointerCapture();
