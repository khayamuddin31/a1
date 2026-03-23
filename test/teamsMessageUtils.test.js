import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageFingerprint,
  createWatchEvent,
  normalizeMessageText,
  normalizeSenderKey,
} from "../src/teamsMessageUtils.js";

test("normalizeSenderKey folds case and whitespace", () => {
  assert.equal(normalizeSenderKey("  Alice   Smith "), "alice smith");
});

test("normalizeMessageText collapses repeated whitespace", () => {
  assert.equal(normalizeMessageText("Hello   from\nTeams"), "Hello from Teams");
});

test("createWatchEvent builds a normalized sender event", () => {
  const event = createWatchEvent({
    senderName: "  Alice Smith ",
    text: "Hello   from\nTeams",
    pageUrl: "https://teams.microsoft.com/v2/",
    conversationHint: "Operations chat",
    timestampLabel: "9:15 AM",
  });

  assert.deepEqual(event, {
    senderId: "alice smith",
    senderName: "Alice Smith",
    text: "Hello from Teams",
    timestampLabel: "9:15 AM",
    conversationHint: "Operations chat",
    pageUrl: "https://teams.microsoft.com/v2/",
    fingerprint: createMessageFingerprint({
      senderId: "alice smith",
      senderName: "Alice Smith",
      text: "Hello from Teams",
      timestampLabel: "9:15 AM",
      conversationHint: "Operations chat",
      pageUrl: "https://teams.microsoft.com/v2/",
    }),
  });
});

test("createWatchEvent ignores candidates without sender or message text", () => {
  assert.equal(
    createWatchEvent({
      senderName: "",
      text: "Hello",
    }),
    null,
  );
  assert.equal(
    createWatchEvent({
      senderName: "Alice",
      text: "",
    }),
    null,
  );
});
