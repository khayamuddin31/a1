import assert from "node:assert/strict";
import test from "node:test";

import { buildVoiceMessage, createCallService } from "../src/services/callService.js";

test("buildVoiceMessage includes sender and a message preview", () => {
  const message = buildVoiceMessage({
    senderName: "Alice",
    text: "Deployment failed in production and needs immediate attention.",
  });

  assert.match(message, /Alice/);
  assert.match(message, /Deployment failed/);
  assert.match(message, /check Microsoft Teams now/i);
});

test("placeAlertCall sends a TwiML call request through Twilio", async () => {
  const requests = [];
  const service = createCallService({
    fromNumber: "+15550001111",
    toNumber: "+15550002222",
    client: {
      calls: {
        async create(payload) {
          requests.push(payload);
          return { sid: "CA999" };
        },
      },
    },
  });

  const result = await service.placeAlertCall({
    senderName: "Bob",
    text: "Please review the latest team message.",
  });

  assert.equal(result.sid, "CA999");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].from, "+15550001111");
  assert.equal(requests[0].to, "+15550002222");
  assert.match(requests[0].twiml, /Bob/);
  assert.match(requests[0].twiml, /Please review the latest team message/);
});
