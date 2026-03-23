import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createSlackAlertApp } from "./slackApp.js";

const logger = createLogger();

async function bootstrap() {
  const config = loadConfig();
  const slackAlertApp = createSlackAlertApp(config, { logger });

  await slackAlertApp.start();
  logger.info("Slack call alert service started.", {
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
