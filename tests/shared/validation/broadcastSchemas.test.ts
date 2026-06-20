/**
 * @fileoverview Unit tests for broadcast validation schemas.
 *
 * Module under test: shared/validation/broadcastSchemas.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:broadcast-schemas`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendBroadcastSchema } from "@shared/validation/broadcastSchemas";
import { BROADCAST_CHANNELS } from "@shared/constants/broadcastChannels";

describe("sendBroadcastSchema", () => {
  it("accepts web and telegram channels", () => {
    const result = sendBroadcastSchema.safeParse({
      body: "Hello everyone",
      channels: [BROADCAST_CHANNELS.web_toast, BROADCAST_CHANNELS.telegram_dm],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.variant, "info");
      assert.equal(result.data.title, null);
    }
  });

  it("rejects empty body", () => {
    const result = sendBroadcastSchema.safeParse({
      body: "   ",
      channels: [BROADCAST_CHANNELS.web_toast],
    });
    assert.equal(result.success, false);
  });

  it("rejects empty channel list", () => {
    const result = sendBroadcastSchema.safeParse({
      body: "Hello",
      channels: [],
    });
    assert.equal(result.success, false);
  });
});
