import express from "express";
import { CloudAdapter, ConfigurationBotFrameworkAuthentication } from "botbuilder";

import { createCallService } from "./services/callService.js";
import { createAlertService } from "./services/alertService.js";
import { extractTeamsMessageEvent } from "./teamsActivity.js";

function isSimulationAuthorized(request, sharedSecret) {
  if (!sharedSecret) {
    return true;
  }

  return request.get("x-simulation-secret") === sharedSecret;
}

function createAdapter(config, logger) {
  const authConfig = {
    MicrosoftAppId: config.teams.appId,
    MicrosoftAppPassword: config.teams.appPassword,
    MicrosoftAppType: config.teams.appType,
    MicrosoftAppTenantId: config.teams.appTenantId || "",
  };

  const adapter = new CloudAdapter(new ConfigurationBotFrameworkAuthentication(authConfig));

  adapter.onTurnError = async (_context, error) => {
    logger.error("Teams adapter failed while processing a message.", {
      error: error instanceof Error ? error.message : String(error),
    });
  };

  return adapter;
}

export function createTeamsAlertApp(
  config,
  { logger = console, adapter, callService, alertService } = {},
) {
  const app = express();

  const resolvedCallService =
    callService ??
    createCallService({
      accountSid: config.twilio.accountSid,
      authToken: config.twilio.authToken,
      fromNumber: config.twilio.fromNumber,
      toNumber: config.twilio.toNumber,
    });

  const resolvedAlertService =
    alertService ??
    createAlertService({
      watchedUserIds: config.alerts.watchedUserIds,
      cooldownMs: config.alerts.cooldownMs,
      callService: resolvedCallService,
      logger,
    });

  const resolvedAdapter = adapter ?? createAdapter(config, logger);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.post("/simulate-message", express.json(), async (request, response) => {
    if (!isSimulationAuthorized(request, config.alerts.simulationSharedSecret)) {
      response.status(401).json({ error: "Unauthorized simulation request." });
      return;
    }

    try {
      const result = await resolvedAlertService.handleMessage({
        senderId: request.body.senderId,
        senderName: request.body.senderName,
        text: request.body.text,
        channelId: "msteams",
        conversationId: request.body.conversationId,
        isBot: false,
      });

      response.json(result);
    } catch (error) {
      logger.error("Simulation endpoint failed.", {
        error: error instanceof Error ? error.message : String(error),
      });

      response.status(500).json({ error: "Simulation failed." });
    }
  });

  app.post("/api/messages", async (request, response) => {
    await resolvedAdapter.process(request, response, async (context) => {
      const event = extractTeamsMessageEvent(context.activity);

      if (!event) {
        return;
      }

      const result = await resolvedAlertService.handleMessage(event);

      if (!result.triggered) {
        logger.info("Teams message did not produce a phone call.", {
          senderId: event.senderId,
          reason: result.reason,
        });
      }
    });
  });

  return {
    app,
    start() {
      return new Promise((resolve) => {
        const server = app.listen(config.server.port, () => resolve(server));
      });
    },
  };
}
