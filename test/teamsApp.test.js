import assert from "node:assert/strict";
import test from "node:test";

import { createTeamsAlertApp } from "../src/teamsApp.js";

test("createTeamsAlertApp builds an express app when collaborators are injected", () => {
  const teamsApp = createTeamsAlertApp(
    {
      server: {
        port: 3000,
      },
      teams: {
        appId: "app-id",
        appPassword: "app-password",
        appType: "MultiTenant",
        appTenantId: null,
      },
      twilio: {
        accountSid: "sid",
        authToken: "token",
        fromNumber: "+15550001111",
        toNumber: "+15550002222",
      },
      alerts: {
        watchedUserIds: ["11111111-2222-3333-4444-555555555555"],
        cooldownMs: 0,
        simulationSharedSecret: null,
      },
    },
    {
      adapter: {
        async process(_request, _response, logic) {
          await logic({
            activity: {
              type: "message",
              text: "hello",
              from: {
                aadObjectId: "11111111-2222-3333-4444-555555555555",
                name: "Alice",
                role: "user",
              },
            },
          });
        },
      },
      callService: {
        async placeAlertCall() {
          return { sid: "CA123" };
        },
      },
      alertService: {
        async handleMessage() {
          return { triggered: false, reason: "sender_not_watched" };
        },
      },
      logger: {
        info() {},
        error() {},
      },
    },
  );

  assert.equal(typeof teamsApp.start, "function");
  assert.equal(typeof teamsApp.app.get, "function");
});
