import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createTeamsAlertApp } from "./teamsApp.js";

const logger = createLogger();

async function bootstrap() {
  const config = loadConfig();
  const teamsAlertApp = createTeamsAlertApp(config, { logger });

  await teamsAlertApp.start();
  logger.info("Microsoft Teams call alert service started.", {
    port: config.server.port,
    watchedUsers: config.alerts.watchedUserIds.length,
  });
}

bootstrap().catch((error) => {
  logger.error("Application failed to start.", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exit(1);
});
