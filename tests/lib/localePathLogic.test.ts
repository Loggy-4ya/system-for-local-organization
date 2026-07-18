/**
 * @fileoverview Unit tests for locale-prefixed pathname helpers.
 *
 * Run: `npm run test:locale-path-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/lib/localePathLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localeFromPathname,
  stripLocalePrefix,
  withLocalePrefix,
} from "@/lib/localePathLogic";

describe("localePathLogic", () => {
  it("stripLocalePrefix removes supported locale segments", () => {
    assert.equal(stripLocalePrefix("/en/profile"), "/profile");
    assert.equal(stripLocalePrefix("/uk/tasks/new"), "/tasks/new");
    assert.equal(stripLocalePrefix("/en"), "/");
    assert.equal(stripLocalePrefix("/profile"), "/profile");
  });

  it("localeFromPathname reads locale prefix when present", () => {
    assert.equal(localeFromPathname("/en/login"), "en");
    assert.equal(localeFromPathname("/uk/admin/users"), "uk");
    assert.equal(localeFromPathname("/profile"), null);
  });

  it("withLocalePrefix adds locale to internal paths", () => {
    assert.equal(withLocalePrefix("uk", "/profile"), "/uk/profile");
    assert.equal(withLocalePrefix("en", "/"), "/en");
  });
});
