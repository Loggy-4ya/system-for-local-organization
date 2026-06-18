/**
 * @fileoverview Unit tests for Page domain validation.
 *
 * Module under test: shared/domains/PageDomain.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-domain`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";

describe("PageDomain.assertDeletablePath", () => {
  it("accepts a normal CMS slug path", () => {
    assert.equal(PageDomain.assertDeletablePath("/news"), "/news");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(PageDomain.assertDeletablePath("  /about  "), "/about");
  });

  it("rejects the homepage", () => {
    assert.throws(
      () => PageDomain.assertDeletablePath("/"),
      (error: unknown) =>
        error instanceof PageDomainError &&
        error.httpStatus === 400 &&
        /homepage/i.test(error.message),
    );
  });

  it("rejects empty paths", () => {
    assert.throws(
      () => PageDomain.assertDeletablePath("   "),
      (error: unknown) => error instanceof PageDomainError && error.httpStatus === 400,
    );
  });

  it("rejects paths without a leading slash", () => {
    assert.throws(
      () => PageDomain.assertDeletablePath("news"),
      (error: unknown) => error instanceof PageDomainError && error.httpStatus === 400,
    );
  });
});
