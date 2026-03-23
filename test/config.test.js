import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

function createBaseEnv(overrides = {}) {
  return {
    TEAMS_WEB_URL: "https://teams.microsoft.com/v2/",
    BROWSER_PROFILE_DIR: ".teams-browser-profile",
    HEADLESS: "false",
    POLL_INTERVAL_SECONDS: "5",
    TWILIO_ACCOUNT_SID: "AC12345678901234567890123456789012",
    TWILIO_AUTH_TOKEN: "token",
    TWILIO_FROM_NUMBER: "+15550001111",
    ALERT_TO_NUMBER: "+15550002222",
    CALL_COOLDOWN_SECONDS: "300",
    ...overrides,
  };
}

test("loadConfig accepts WATCHED_SENDERS for the local watcher", () => {
  const config = loadConfig(
    createBaseEnv({
      WATCHED_SENDERS: "Alice Smith,Bob Jones",
    }),
  );

  assert.deepEqual(config.alerts.watchedSenders, ["Alice Smith", "Bob Jones"]);
});

test("loadConfig reports the new variable name when senders are missing", () => {
  assert.throws(
    () => loadConfig(createBaseEnv()),
    /Missing required environment variable: WATCHED_SENDERS/,
  );
});
