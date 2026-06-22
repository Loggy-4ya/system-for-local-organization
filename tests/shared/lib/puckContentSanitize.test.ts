/**
 * Run: npm run test:puck-content-sanitize
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for Puck layout JSON sanitization on save.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizePuckDataForStorageWithReport } from "@shared/lib/puckContentSanitize";

describe("sanitizePuckDataForStorage", () => {
  it("strips unsafe href props on nested blocks", () => {
    const input = {
      content: [
        {
          type: "NexusButton",
          props: {
            label: "Click",
            href: "javascript:alert(1)",
          },
        },
      ],
      zones: {},
    };

    const { data: out } = sanitizePuckDataForStorageWithReport(input);
    assert.equal((out as typeof input).content[0].props.href, "");
  });

  it("preserves safe media upload paths", () => {
    const input = {
      content: [
        {
          type: "NexusImage",
          props: {
            image: "/uploads/puck-blocks/photo.png",
            alt: "Photo",
          },
        },
      ],
      zones: {},
    };

    const { data: out } = sanitizePuckDataForStorageWithReport(input);
    assert.equal(
      (out as typeof input).content[0].props.image,
      "/uploads/puck-blocks/photo.png",
    );
  });

  it("sanitizes rich text HTML in text props", () => {
    const input = {
      content: [
        {
          type: "NexusText",
          props: {
            text: '<p>Hi</p><script>alert(1)</script>',
          },
        },
      ],
      zones: {},
    };

    const { data: out } = sanitizePuckDataForStorageWithReport(input);
    assert.equal((out as typeof input).content[0].props.text, "<p>Hi</p>");
  });

  it("rejects unsafe image URLs while keeping alt text", () => {
    const input = {
      content: [
        {
          type: "NexusNewsCard",
          props: {
            image: "javascript:alert(1)",
            title: "News",
          },
        },
      ],
      zones: {},
    };

    const { data, report } = sanitizePuckDataForStorageWithReport(input);
    const out = data as typeof input;
    assert.equal(out.content[0].props.image, "");
    assert.equal(out.content[0].props.title, "News");
    assert.equal(report.events.length, 1);
    assert.equal(report.events[0]?.kind, "media");
  });
});
