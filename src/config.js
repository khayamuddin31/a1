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

function parseCsvList(rawValue) {
  return (rawValue || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function loadConfig(env = process.env) {
  const watchedUserIds = parseCsvList(
    getOptional(env, "WATCHED_TEAMS_USER_IDS") ?? getRequired(env, "WATCHED_USER_IDS"),
  );

  if (watchedUserIds.length === 0) {
    throw new Error("WATCHED_TEAMS_USER_IDS must include at least one Microsoft Teams user ID.");
  }

  return {
    server: {
      port: getInteger(env, "PORT", 3000),
    },
    teams: {
      appId: getOptional(env, "MicrosoftAppId") ?? getRequired(env, "TEAMS_BOT_APP_ID"),
      appPassword:
        getOptional(env, "MicrosoftAppPassword") ?? getRequired(env, "TEAMS_BOT_APP_PASSWORD"),
      appType: getOptional(env, "MicrosoftAppType", "MultiTenant"),
      appTenantId: getOptional(env, "MicrosoftAppTenantId"),
    },
    twilio: {
      accountSid: getRequired(env, "TWILIO_ACCOUNT_SID"),
      authToken: getRequired(env, "TWILIO_AUTH_TOKEN"),
      fromNumber: getRequired(env, "TWILIO_FROM_NUMBER"),
      toNumber: getRequired(env, "ALERT_TO_NUMBER"),
    },
    alerts: {
      watchedUserIds,
      cooldownMs: getInteger(env, "CALL_COOLDOWN_SECONDS", 300) * 1000,
      simulationSharedSecret: getOptional(env, "SIMULATION_SHARED_SECRET"),
    },
  };
}
