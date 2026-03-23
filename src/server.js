import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createTeamsWebWatcher } from "./teamsWatcher.js";

const logger = createLogger();
let teamsWatcher = null;

async function shutdown(signal) {
  logger.info("Shutting down Teams web watcher.", { signal });

  try {
    if (teamsWatcher) {
      await teamsWatcher.close();
    }
  } finally {
    process.exit(0);
  }
}

async function bootstrap() {
  const config = loadConfig();
  teamsWatcher = createTeamsWebWatcher(config, { logger });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  logger.info("Microsoft Teams call alert watcher starting.", {
    watchedSenders: config.alerts.watchedSenders.length,
    pollIntervalMs: config.teamsWeb.pollIntervalMs,
  });

  await teamsWatcher.run();
}

bootstrap().catch((error) => {
  logger.error("Application failed to start.", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exit(1);
});
