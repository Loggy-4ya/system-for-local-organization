/**
 * @fileoverview Unit tests for layout InfiniteGrid cursor spotlight sync.
 *
 * Module under test: src/components/background/infiniteGridCursorSync.ts
 * Run: `npm run test:infinite-grid-cursor-sync`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  syncInfiniteGridWrapperCursor,
  syncLayoutInfiniteGridCursorFromPreviewIframe,
} from "@/components/background/infiniteGridCursorSync";

describe("syncInfiniteGridWrapperCursor", () => {
  it("writes wrapper-local percentages for viewport coordinates", () => {
    const props = new Map<string, string>();
    const wrapper = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 400,
        height: 300,
      }),
      style: {
        setProperty: (name: string, value: string) => {
          props.set(name, value);
        },
      },
    } as unknown as HTMLElement;

    syncInfiniteGridWrapperCursor(wrapper, 300, 200);

    assert.equal(props.get("--mouse-x"), "50.00%");
    assert.equal(props.get("--mouse-y"), "50.00%");
  });
});

describe("syncLayoutInfiniteGridCursorFromPreviewIframe", () => {
  it("maps iframe pointer coordinates into the parent viewport", () => {
    const props = new Map<string, string>();
    const parentWindow = {
      document: {
        getElementById: () =>
          ({
            getBoundingClientRect: () => ({
              left: 0,
              top: 0,
              width: 1200,
              height: 900,
            }),
            style: {
              setProperty: (name: string, value: string) => {
                props.set(name, value);
              },
            },
          }) as unknown as HTMLElement,
      },
    } as unknown as Window;

    const iframeEl = {
      getBoundingClientRect: () => ({
        left: 320,
        top: 140,
        width: 640,
        height: 480,
      }),
    } as unknown as HTMLIFrameElement;

    const iframeWindow = {
      parent: parentWindow,
      frameElement: iframeEl,
    } as unknown as Window;

    const iframeDocument = {
      defaultView: iframeWindow,
    } as unknown as Document;

    syncLayoutInfiniteGridCursorFromPreviewIframe(
      { clientX: 160, clientY: 120, buttons: 0 },
      iframeDocument,
    );

    assert.equal(props.get("--mouse-x"), "40.00%");
    assert.equal(props.get("--mouse-y"), "28.89%");
  });

  it("ignores pointer events while a mouse button is pressed", () => {
    let called = false;
    const parentWindow = {
      document: {
        getElementById: () => {
          called = true;
          return null;
        },
      },
    } as unknown as Window;

    const iframeDocument = {
      defaultView: {
        parent: parentWindow,
        frameElement: {
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        },
      },
    } as unknown as Document;

    syncLayoutInfiniteGridCursorFromPreviewIframe(
      { clientX: 10, clientY: 10, buttons: 1 },
      iframeDocument,
    );

    assert.equal(called, false);
  });
});
