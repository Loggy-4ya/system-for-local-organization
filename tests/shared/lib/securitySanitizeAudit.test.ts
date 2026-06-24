/**
 * Run: npm run test:security-sanitize-audit
 * Registry: .ai/docs/testing.md
 *
 * @fileoverview Unit tests for sanitization audit report helpers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyPuckSanitizeReport,
  puckSanitizeKindFromPropKey,
  recordPuckSanitizeFieldChange,
} from "@shared/lib/puckContentSanitizeReport";
import { sanitizePuckDataForStorageWithReport } from "@shared/lib/puckContentSanitize";

describe("recordPuckSanitizeFieldChange", () => {
  it("records only when values differ", () => {
    const report = createEmptyPuckSanitizeReport();
    recordPuckSanitizeFieldChange(report, "content[0].props.href", "href", "/ok", "/ok");
    assert.equal(report.events.length, 0);

    recordPuckSanitizeFieldChange(
      report,
      "content[0].props.href",
      "href",
      "javascript:alert(1)",
      "",
    );
    assert.equal(report.events.length, 1);
    assert.equal(report.events[0]?.kind, "href");
    assert.equal(report.events[0]?.originalLength, 19);
    assert.equal(report.events[0]?.sanitizedLength, 0);
  });
});

describe("puckSanitizeKindFromPropKey", () => {
  it("maps known Puck prop keys", () => {
    assert.equal(puckSanitizeKindFromPropKey("href"), "href");
    assert.equal(puckSanitizeKindFromPropKey("image"), "media");
    assert.equal(puckSanitizeKindFromPropKey("text"), "rich-text");
    assert.equal(puckSanitizeKindFromPropKey("url"), "url");
  });
});

describe("sanitizePuckDataForStorageWithReport", () => {
  it("returns both sanitized data and audit events", () => {
    const input = {
      content: [
        {
          type: "NexusNewsCard",
          props: {
            href: "javascript:alert(1)",
            title: "Go",
          },
        },
      ],
      zones: {},
    };

    const { data, report } = sanitizePuckDataForStorageWithReport(input);
    const out = data as typeof input;

    assert.equal(out.content[0].props.href, "");
    assert.equal(report.events.length, 1);
    assert.match(report.events[0]?.path ?? "", /href$/);
  });
});
