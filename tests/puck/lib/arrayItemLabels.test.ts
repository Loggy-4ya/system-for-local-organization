/**
 * @fileoverview Unified auto-label formatters for Puck array fields.
 *
 * Run: npm run test:array-item-labels
 * Registry: .ai/docs/testing.md
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ensureAccordionPanelTitles,
  formatAccordionPanelLabel,
  formatArrayItemLabel,
  formatCarouselSlideLabel,
  formatGridItemLabel,
  formatListStepLabel,
  formatListSubStepLabel,
  formatTabLabel,
  resolveArrayItemSummaryLabel,
} from "@/components/puck/lib/arrayItemLabels";

describe("arrayItemLabels", () => {
  it("uses consistent Word N pattern for generative array items", () => {
    assert.equal(formatCarouselSlideLabel(0), "Slide 1");
    assert.equal(formatGridItemLabel(2), "Cell 3");
    assert.equal(formatListStepLabel(4), "Step 5");
    assert.equal(formatTabLabel(1), "Tab 2");
    assert.equal(formatAccordionPanelLabel(0), "Panel 1");
    assert.equal(formatListSubStepLabel(1, 2), "Sub-step 2.3");
  });

  it("formatArrayItemLabel delegates to the same pattern", () => {
    assert.equal(formatArrayItemLabel("panel", 3), "Panel 4");
    assert.equal(formatArrayItemLabel("substep", 0, 2), "Sub-step 3.1");
  });

  it("resolveArrayItemSummaryLabel falls back when label text is empty or missing", () => {
    assert.equal(resolveArrayItemSummaryLabel("panel", undefined, 0, "title"), "Panel 1");
    assert.equal(resolveArrayItemSummaryLabel("panel", { title: "  " }, 2, "title"), "Panel 3");
    assert.equal(
      resolveArrayItemSummaryLabel("panel", { title: "Custom" }, 2, "title"),
      "Custom",
    );
  });

  it("ensureAccordionPanelTitles assigns Panel N without overwriting custom titles", () => {
    assert.deepEqual(
      ensureAccordionPanelTitles([{ title: "", content: "" }, { title: "FAQ", content: "x" }]),
      [
        { title: "Panel 1", content: "" },
        { title: "FAQ", content: "x" },
      ],
    );
  });
});
