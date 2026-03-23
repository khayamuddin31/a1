import assert from "node:assert/strict";
import test from "node:test";

import { extractTeamsMessageEvent } from "../src/teamsActivity.js";

test("extractTeamsMessageEvent maps a Teams message into an alert event", () => {
  const event = extractTeamsMessageEvent({
    type: "message",
    text: "<at>Alice</at> Please check production",
    channelId: "msteams",
    conversation: {
      id: "19:meeting-thread",
    },
    from: {
      aadObjectId: "11111111-2222-3333-4444-555555555555",
      id: "8:orgid:legacy-id",
      name: "Alice",
      role: "user",
    },
  });

  assert.deepEqual(event, {
    senderId: "11111111-2222-3333-4444-555555555555",
    senderName: "Alice",
    text: "Please check production",
    channelId: "msteams",
    conversationId: "19:meeting-thread",
    isBot: false,
    subtype: null,
  });
});

test("extractTeamsMessageEvent ignores non-message activities", () => {
  const event = extractTeamsMessageEvent({
    type: "conversationUpdate",
    from: {
      aadObjectId: "11111111-2222-3333-4444-555555555555",
    },
  });

  assert.equal(event, null);
});

test("extractTeamsMessageEvent marks edit and delete events as subtypes", () => {
  const event = extractTeamsMessageEvent({
    type: "message",
    text: "Edited text",
    channelData: {
      eventType: "editMessage",
    },
    from: {
      id: "8:orgid:legacy-id",
      name: "Alice",
      role: "user",
    },
  });

  assert.equal(event.senderId, "8:orgid:legacy-id");
  assert.equal(event.subtype, "editMessage");
});
