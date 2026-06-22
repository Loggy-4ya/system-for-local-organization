/**
 * @fileoverview Unit tests for Nexus page variable interpolation.
 *
 * Module under test: shared/lib/nexusPageVariables.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:nexus-page-variables`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNexusPageVariableMap,
  interpolateNexusPageVariables,
} from "@shared/lib/nexusPageVariables";

describe("interpolateNexusPageVariables", () => {
  it("replaces ${{ name }} tokens with optional spaces", () => {
    const variables = buildNexusPageVariableMap({
      title: "Spring Fair",
      description: "Student council news",
      coverImage: "/uploads/cover.jpg",
      slug: "news/spring-fair",
      path: "/news/spring-fair",
    });

    assert.equal(interpolateNexusPageVariables("${{ title }}", variables), "Spring Fair");
    assert.equal(
      interpolateNexusPageVariables("Read ${{ title }} — ${{ description }}", variables),
      "Read Spring Fair — Student council news",
    );
    assert.equal(interpolateNexusPageVariables("${{  image  }}", variables), "/uploads/cover.jpg");
  });

  it("leaves unknown tokens unchanged", () => {
    const variables = buildNexusPageVariableMap({ title: "News" });
    assert.equal(interpolateNexusPageVariables("${{ missing }}", variables), "${{ missing }}");
  });
});

describe("buildNexusPageVariableMap", () => {
  it("aliases image and author fields", () => {
    const map = buildNexusPageVariableMap({
      title: "Hello",
      coverImage: "/img.png",
      authorDisplayName: "Ada Lovelace",
      viewCount: 12,
      likeCount: 3,
    });

    assert.equal(map.image, "/img.png");
    assert.equal(map.coverImage, "/img.png");
    assert.equal(map.author, "Ada Lovelace");
    assert.equal(map.authorName, "Ada Lovelace");
    assert.equal(map.views, "12");
    assert.equal(map.likes, "3");
  });
});
