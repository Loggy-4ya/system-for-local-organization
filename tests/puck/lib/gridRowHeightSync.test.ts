/**
 * Run: npm run test:grid-row-height-sync
 * Registry: .ai/docs/testing.md
 *
 * Module under test: src/components/puck/lib/gridRowHeightSync.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  expandGridRowTracksToCarouselSlideHeight,
  formatGridTemplateRows,
  readCarouselGridSlideHeightAnchorPx,
  resolveFullyEmptyGridRowIndices,
  gridCellHasPuckContent,
  gridAllCellsHaveContentFromDom,
  gridAllCellsHaveContentFromItems,
  parseGridRowPlacement,
  resolveGridCellEditEmptyFloorPx,
  resolveGridRowTrackHeightsPx,
  resolveVideoAspectRatioFromDom,
} from "@/components/puck/lib/gridRowHeightSync";
import { resolveGridCellPlacements } from "@/components/puck/lib/gridCellPlacement";

describe("parseGridRowPlacement", () => {
  it("parses span syntax", () => {
    assert.deepEqual(parseGridRowPlacement("2 / span 1"), { startLine: 2, span: 1 });
    assert.deepEqual(parseGridRowPlacement("1 / span 2"), { startLine: 1, span: 2 });
  });
});

describe("resolveGridRowTrackHeightsPx", () => {
  it("uses the tallest cell per row track", () => {
    const placements = [
      { gridColumn: "1 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "1 / span 6", gridRow: "2 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "2 / span 1" },
    ];

    const rowHeights = resolveGridRowTrackHeightsPx(
      placements,
      [180, 320, 140, 260],
      [180, null, null, 220],
    );

    assert.deepEqual(rowHeights, [320, 260]);
  });

  it("uses video height as the row floor for shorter siblings", () => {
    const placements = [
      { gridColumn: "1 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "1 / span 1" },
    ];

    const rowHeights = resolveGridRowTrackHeightsPx(
      placements,
      [320, 80],
      [320, null],
      { rowAbsoluteMinPx: 120 },
    );

    assert.deepEqual(rowHeights, [320]);
  });

  it("applies the absolute row minimum when measured cells are shorter", () => {
    const placements = [
      { gridColumn: "1 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "1 / span 1" },
    ];

    const rowHeights = resolveGridRowTrackHeightsPx(
      placements,
      [40, 60],
      [null, null],
      { rowAbsoluteMinPx: 120 },
    );

    assert.deepEqual(rowHeights, [120]);
  });

  it("does not create a phantom middle row when edit mode uses single-row spans", () => {
    const legacySpanTwoPlacements = resolveGridCellPlacements(12, [
      { spanCol: 6, spanRow: 2 },
      { spanCol: 6, spanRow: 2 },
      { spanCol: 6, spanRow: 1 },
      { spanCol: 6, spanRow: 1 },
    ]);
    const editSpanOnePlacements = resolveGridCellPlacements(12, [
      { spanCol: 6, spanRow: 1 },
      { spanCol: 6, spanRow: 1 },
      { spanCol: 6, spanRow: 1 },
      { spanCol: 6, spanRow: 1 },
    ]);

    assert.equal(legacySpanTwoPlacements[2]?.gridRow, "3 / span 1");
    assert.equal(editSpanOnePlacements[2]?.gridRow, "2 / span 1");
  });
});

describe("readCarouselGridSlideHeightAnchorPx", () => {
  it("prefers the slide height CSS variable", () => {
    const slide = {
      style: {
        getPropertyValue: (name: string) =>
          name === "--nexus-carousel-slide-height" ? "360px" : "",
      },
      closest: () => null,
    } as unknown as HTMLElement;

    assert.equal(readCarouselGridSlideHeightAnchorPx(slide), 360);
  });

  it("falls back to carousel row height", () => {
    const carousel = {
      style: {
        getPropertyValue: (name: string) =>
          name === "--nexus-carousel-row-height" ? "420px" : "",
      },
    } as unknown as HTMLElement;

    const slide = {
      style: {
        getPropertyValue: () => "",
      },
      closest: () => carousel,
    } as unknown as HTMLElement;

    assert.equal(readCarouselGridSlideHeightAnchorPx(slide), 420);
  });
});

describe("expandGridRowTracksToCarouselSlideHeight", () => {
  const twoByTwoPlacements = [
    { gridColumn: "1 / span 1", gridRow: "1 / span 1" },
    { gridColumn: "2 / span 1", gridRow: "1 / span 1" },
    { gridColumn: "1 / span 1", gridRow: "2 / span 1" },
    { gridColumn: "2 / span 1", gridRow: "2 / span 1" },
  ] as const;

  const createEmptyGridMock = (slide: HTMLElement) =>
    ({
      closest: () => slide,
      style: { rowGap: "", gap: "8px" },
      querySelector: () => null,
    }) as unknown as HTMLElement;

  it("distributes extra anchored slide height evenly across fully empty row tracks", () => {
    const slide = {
      style: {
        getPropertyValue: (name: string) =>
          name === "--nexus-carousel-slide-height" ? "400px" : "",
      },
    } as unknown as HTMLElement;

    const grid = createEmptyGridMock(slide);

    assert.deepEqual(
      expandGridRowTracksToCarouselSlideHeight(grid, [120, 120], twoByTwoPlacements),
      [196, 196],
    );
  });

  it("expands only fully empty rows so occupied media rows stay intrinsic", () => {
    const slide = {
      style: {
        getPropertyValue: (name: string) =>
          name === "--nexus-carousel-slide-height" ? "400px" : "",
      },
    } as unknown as HTMLElement;

    const occupiedShell = {
      querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
    } as unknown as HTMLElement;

    const emptyShell = {
      querySelector: () => ({ className: "DropZone" }),
    } as unknown as HTMLElement;

    const grid = {
      closest: () => slide,
      style: { rowGap: "", gap: "8px" },
      querySelector: (selector: string) => {
        if (selector.includes('"0"')) {
          return occupiedShell;
        }
        return emptyShell;
      },
    } as unknown as HTMLElement;

    assert.deepEqual(
      expandGridRowTracksToCarouselSlideHeight(grid, [180, 80], twoByTwoPlacements),
      [180, 212],
    );
  });

  it("returns measured tracks when no height anchor is set", () => {
    const slide = {
      style: {
        getPropertyValue: () => "",
      },
      closest: () => null,
    } as unknown as HTMLElement;

    const grid = createEmptyGridMock(slide);

    assert.deepEqual(
      expandGridRowTracksToCarouselSlideHeight(grid, [120, 120], twoByTwoPlacements),
      [120, 120],
    );
  });
});

describe("resolveFullyEmptyGridRowIndices", () => {
  it("marks rows with any occupied cell as non-empty", () => {
    const occupiedShell = {
      querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
    } as unknown as HTMLElement;

    const emptyShell = {
      querySelector: () => ({ className: "DropZone" }),
    } as unknown as HTMLElement;

    const grid = {
      querySelector: (selector: string) => {
        if (selector.includes('"0"')) {
          return occupiedShell;
        }
        return emptyShell;
      },
    } as unknown as HTMLElement;

    const placements = [
      { gridColumn: "1 / span 1", gridRow: "1 / span 1" },
      { gridColumn: "2 / span 1", gridRow: "1 / span 1" },
      { gridColumn: "1 / span 1", gridRow: "2 / span 1" },
      { gridColumn: "2 / span 1", gridRow: "2 / span 1" },
    ];

    const fullyEmptyRows = resolveFullyEmptyGridRowIndices(grid, placements);
    assert.deepEqual([...fullyEmptyRows].sort(), [1]);
  });
});

describe("formatGridTemplateRows", () => {
  it("formats explicit row tracks", () => {
    assert.equal(formatGridTemplateRows([320, 260]), "320px 260px");
  });
});

describe("gridCellHasPuckContent", () => {
  it("detects occupied drop zones", () => {
    const occupied = {
      querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
    } as unknown as HTMLElement;

    const empty = {
      querySelector: () => ({ className: "DropZone" }),
    } as unknown as HTMLElement;

    assert.equal(gridCellHasPuckContent(occupied), true);
    assert.equal(gridCellHasPuckContent(empty), false);
  });
});

describe("gridAllCellsHaveContentFromItems", () => {
  it("returns true only when every cell slot has nested blocks", () => {
    assert.equal(
      gridAllCellsHaveContentFromItems([
        { content: [{ type: "NexusVideo", props: { id: "v1" } }] },
        { content: [{ type: "NexusImage", props: { id: "i1" } }] },
      ]),
      true,
    );
  });

  it("returns false when any cell slot is empty", () => {
    assert.equal(
      gridAllCellsHaveContentFromItems([
        { content: [{ type: "NexusVideo", props: { id: "v1" } }] },
        { content: [] },
      ]),
      false,
    );
  });
});

describe("gridAllCellsHaveContentFromDom", () => {
  it("returns true only when every cell shell is occupied", () => {
    const grid = {
      querySelectorAll: () => [
        {
          getAttribute: () => "0",
          querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
        },
        {
          getAttribute: () => "1",
          querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
        },
      ],
    } as unknown as HTMLElement;

    assert.equal(gridAllCellsHaveContentFromDom(grid), true);
  });

  it("returns false when any cell is still empty", () => {
    const grid = {
      querySelectorAll: () => [
        {
          querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
        },
        {
          querySelector: () => ({ className: "DropZone" }),
        },
      ],
    } as unknown as HTMLElement;

    assert.equal(gridAllCellsHaveContentFromDom(grid), false);
  });
});

describe("resolveGridCellEditEmptyFloorPx", () => {
  it("returns carousel and page empty floors for vacant cells", () => {
    const empty = {
      querySelector: () => ({ className: "DropZone" }),
    } as unknown as HTMLElement;

    assert.equal(resolveGridCellEditEmptyFloorPx(empty, true), 120);
    assert.equal(resolveGridCellEditEmptyFloorPx(empty, false), 240);
  });

  it("returns zero when the cell already has content", () => {
    const occupied = {
      querySelector: () => ({ className: "DropZone DropZone--hasChildren" }),
    } as unknown as HTMLElement;

    assert.equal(resolveGridCellEditEmptyFloorPx(occupied, true), 0);
  });
});

describe("resolveVideoAspectRatioFromDom", () => {
  it("reads data-nexus-media-aspect from the video root", () => {
    const video = {
      getAttribute: (name: string) => (name === "data-nexus-media-aspect" ? "16/9" : null),
      querySelector: () => null,
    } as unknown as HTMLElement;

    assert.equal(resolveVideoAspectRatioFromDom(video), 16 / 9);
  });

  it("falls back to the frame inline aspect ratio", () => {
    const video = {
      getAttribute: () => null,
      ownerDocument: { defaultView: null },
      querySelector: () => ({
        getAttribute: () => null,
        style: { aspectRatio: "4 / 3" },
      }),
    } as unknown as HTMLElement;

    assert.equal(resolveVideoAspectRatioFromDom(video), 4 / 3);
  });
});
