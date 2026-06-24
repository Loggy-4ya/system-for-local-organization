/**
 * @fileoverview Unit tests for site toast motion helpers.
 *
 * Run: `npm run test:site-toast-motion`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSiteToastExitAnimationEnd,
  SITE_TOAST_EXIT_ANIMATION,
} from "@/lib/siteToastMotion";

describe("isSiteToastExitAnimationEnd", () => {
  it("returns true only for exit animation on the toast root", () => {
    const root = {} as EventTarget;
    const event = {
      target: root,
      currentTarget: root,
      animationName: SITE_TOAST_EXIT_ANIMATION,
    } as AnimationEvent;

    assert.equal(isSiteToastExitAnimationEnd(event), true);
  });

  it("ignores enter animation events", () => {
    const root = {} as EventTarget;
    const event = {
      target: root,
      currentTarget: root,
      animationName: "site-toast-slide-in",
    } as AnimationEvent;

    assert.equal(isSiteToastExitAnimationEnd(event), false);
  });

  it("ignores bubbled child animation events", () => {
    const root = {} as EventTarget;
    const child = {} as EventTarget;
    const event = {
      target: child,
      currentTarget: root,
      animationName: SITE_TOAST_EXIT_ANIMATION,
    } as AnimationEvent;

    assert.equal(isSiteToastExitAnimationEnd(event), false);
  });
});
