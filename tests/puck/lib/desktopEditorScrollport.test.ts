/**
 * Desktop Puck scrollport + fixed-viewport centering CSS contract.
 *
 * Run: `npm run test:desktop-editor-scrollport`
 * Registry: `.ai/docs/testing.md` — `tests/puck/lib/desktopEditorScrollport.test.ts`
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findMissingDesktopFixedViewportCenteringCss,
  matchesDesktopEditorLayout,
} from "@/components/puck/lib/desktopEditorScrollport";

const PUCK_EDITOR_CSS = readFileSync(
  join(process.cwd(), "src/app/puck-editor.css"),
  "utf8",
);

describe("desktopEditorScrollport", () => {
  it("matchesDesktopEditorLayout is false below 901px", () => {
    const mq = {
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const win = {
      matchMedia: () => mq,
    } as Window;

    assert.equal(matchesDesktopEditorLayout(win), false);
  });

  it("puck-editor.css keeps fixed presets centered and layout shell transparent", () => {
    const missing = findMissingDesktopFixedViewportCenteringCss(PUCK_EDITOR_CSS);
    assert.deepEqual(missing, []);
  });
});
