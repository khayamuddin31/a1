import "dotenv/config";

function getRequired(env, key) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOptional(env, key, fallback = null) {
  const value = env[key]?.trim();
  return value || fallback;
}

function getInteger(env, key, fallback) {
  const rawValue = env[key];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer.`);
  }

  return parsed;
}

function getBoolean(env, key, fallback) {
  const rawValue = env[key];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const normalized = String(rawValue).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${key} must be a boolean value.`);
}

function parseCsvList(rawValue) {
  return (rawValue || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getFirstPresent(env, keys) {
  for (const key of keys) {
    const value = env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

const DEFAULT_SELECTORS = {
  messageContainers: [
    '[data-tid*="message"]',
    '[data-tid*="chat-pane-item"]',
    '[data-tid*="message-pane-item"]',
    '[data-tid*="chat-list-item"]',
    'article',
    '[role="listitem"]',
  ],
  sender: [
    '[data-tid*="author"]',
    '[data-tid*="sender"]',
    '[data-tid*="display-name"]',
    '[data-tid*="chat-list-item-title"]',
    '[data-tid*="persona-primary-text"]',
    '[data-tid*="message-author-name"]',
    '[data-tid*="threadBodyDisplayName"]',
    '[aria-label*="sent by"]',
    '[role="heading"]',
    'h3',
    'h4',
    'strong',
  ],
  text: [
    '[data-tid*="message-body"]',
    '[data-tid*="message-text"]',
    '[data-tid*="chat-list-item-preview"]',
    '[data-tid*="message-preview"]',
    '[data-tid*="body-content"]',
    '[data-tid*="rich-text"]',
    '[dir="auto"]',
    'p',
  ],
  timestamp: [
    'time',
    '[data-tid*="timestamp"]',
    '[data-tid*="message-time"]',
    '[aria-label*="AM"]',
    '[aria-label*="PM"]',
  ],
};

function getSelectorList(env, key, fallback) {
  const parsed = parseCsvList(env[key]);
  return parsed.length > 0 ? parsed : fallback;
}

export function loadConfig(env = process.env) {
  const watchedSenders = parseCsvList(
    getFirstPresent(env, ["WATCHED_SENDERS", "WATCHED_TEAMS_USER_IDS", "WATCHED_USER_IDS"]),
  );

  if (watchedSenders.length === 0) {
    throw new Error(
      "Missing required environment variable: WATCHED_SENDERS (legacy aliases WATCHED_TEAMS_USER_IDS and WATCHED_USER_IDS are also accepted).",
    );
  }

  return {
    teamsWeb: {
      url: getOptional(env, "TEAMS_WEB_URL", "https://teams.microsoft.com/v2/"),
      profileDir: getOptional(env, "BROWSER_PROFILE_DIR", ".teams-browser-profile"),
      channel: getOptional(env, "BROWSER_CHANNEL"),
      headless: getBoolean(env, "HEADLESS", false),
      pollIntervalMs: getInteger(env, "POLL_INTERVAL_SECONDS", 5) * 1000,
      selectors: {
        messageContainers: getSelectorList(
          env,
          "TEAMS_MESSAGE_CONTAINER_SELECTORS",
          DEFAULT_SELECTORS.messageContainers,
        ),
        sender: getSelectorList(env, "TEAMS_SENDER_SELECTORS", DEFAULT_SELECTORS.sender),
        text: getSelectorList(env, "TEAMS_TEXT_SELECTORS", DEFAULT_SELECTORS.text),
        timestamp: getSelectorList(env, "TEAMS_TIMESTAMP_SELECTORS", DEFAULT_SELECTORS.timestamp),
      },
    },
    twilio: {
      accountSid: getRequired(env, "TWILIO_ACCOUNT_SID"),
      authToken: getRequired(env, "TWILIO_AUTH_TOKEN"),
      fromNumber: getRequired(env, "TWILIO_FROM_NUMBER"),
      toNumber: getRequired(env, "ALERT_TO_NUMBER"),
    },
    alerts: {
      watchedSenders,
      cooldownMs: getInteger(env, "CALL_COOLDOWN_SECONDS", 300) * 1000,
    },
  };
}
