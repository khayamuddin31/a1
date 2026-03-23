import assert from "node:assert/strict";
import test from "node:test";

import { createAlertService } from "../src/services/alertService.js";

test("triggers a call when a watched sender posts a message", async () => {
  const capturedEvents = [];
  const service = createAlertService({
    watchedUserIds: ["U123"],
    cooldownMs: 0,
    callService: {
      async placeAlertCall(event) {
        capturedEvents.push(event);
        return { sid: "CA123" };
      },
    },
    logger: {
      info() {},
    },
  });

  const result = await service.handleMessage({
    senderId: "U123",
    senderName: "Alice",
    text: "Please check the release channel.",
  });

  assert.equal(result.triggered, true);
  assert.equal(result.callSid, "CA123");
  assert.equal(capturedEvents.length, 1);
  assert.equal(capturedEvents[0].senderName, "Alice");
});

test("ignores messages from senders that are not watched", async () => {
  let callCount = 0;
  const service = createAlertService({
    watchedUserIds: ["U123"],
    callService: {
      async placeAlertCall() {
        callCount += 1;
        return { sid: "CA123" };
      },
    },
    logger: {
      info() {},
    },
  });

  const result = await service.handleMessage({
    senderId: "U999",
    text: "This should not ring the phone.",
  });

  assert.equal(result.triggered, false);
  assert.equal(result.reason, "sender_not_watched");
  assert.equal(callCount, 0);
});

test("respects the cooldown window per watched sender", async () => {
  let now = 1_000;
  let callCount = 0;

  const service = createAlertService({
    watchedUserIds: ["U123"],
    cooldownMs: 60_000,
    now: () => now,
    callService: {
      async placeAlertCall() {
        callCount += 1;
        return { sid: `CA${callCount}` };
      },
    },
    logger: {
      info() {},
    },
  });

  const firstResult = await service.handleMessage({
    senderId: "U123",
    text: "First message.",
  });

  now += 30_000;

  const secondResult = await service.handleMessage({
    senderId: "U123",
    text: "Second message too soon.",
  });

  assert.equal(firstResult.triggered, true);
  assert.equal(secondResult.triggered, false);
  assert.equal(secondResult.reason, "cooldown_active");
  assert.equal(callCount, 1);
});
