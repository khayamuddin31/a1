import assert from "node:assert/strict";
import test from "node:test";

import { createTeamsWatcherState } from "../src/teamsWatcherState.js";

test("first scan becomes a baseline and does not emit alerts", () => {
  const state = createTeamsWatcherState();

  const result = state.ingestCandidates(
    [
      {
        fingerprint: "alice::hello",
      },
    ],
    "https://teams.microsoft.com/v2/",
  );

  assert.equal(result.isBaseline, true);
  assert.deepEqual(result.newCandidates, []);
});

test("second scan on the same page emits unseen candidates only", () => {
  const state = createTeamsWatcherState();

  state.ingestCandidates(
    [
      {
        fingerprint: "alice::hello",
      },
    ],
    "https://teams.microsoft.com/v2/",
  );

  const result = state.ingestCandidates(
    [
      {
        fingerprint: "alice::hello",
      },
      {
        fingerprint: "bob::new",
      },
    ],
    "https://teams.microsoft.com/v2/",
  );

  assert.equal(result.isBaseline, false);
  assert.deepEqual(result.newCandidates, [
    {
      fingerprint: "bob::new",
    },
  ]);
});

test("url changes reset the baseline to avoid replaying old conversations", () => {
  const state = createTeamsWatcherState();

  state.ingestCandidates(
    [
      {
        fingerprint: "alice::hello",
      },
    ],
    "https://teams.microsoft.com/v2/chat-1",
  );

  const result = state.ingestCandidates(
    [
      {
        fingerprint: "carol::historic",
      },
    ],
    "https://teams.microsoft.com/v2/chat-2",
  );

  assert.equal(result.isBaseline, true);
  assert.deepEqual(result.newCandidates, []);
});
