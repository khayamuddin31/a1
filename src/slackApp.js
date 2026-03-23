import { App, ExpressReceiver } from "@slack/bolt";
import express from "express";

import { createAlertService } from "./services/alertService.js";
import { createCallService } from "./services/callService.js";

function isSimulationAuthorized(request, sharedSecret) {
  if (!sharedSecret) {
    return true;
  }

  return request.get("x-simulation-secret") === sharedSecret;
}

export function createSlackAlertApp(config, { logger = console } = {}) {
  const receiver = new ExpressReceiver({
    signingSecret: config.slack.signingSecret,
    processBeforeResponse: true,
  });

  const callService = createCallService({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    fromNumber: config.twilio.fromNumber,
    toNumber: config.twilio.toNumber,
  });

  const alertService = createAlertService({
    watchedUserIds: config.alerts.watchedUserIds,
    cooldownMs: config.alerts.cooldownMs,
    callService,
    logger,
  });

  const slackApp = new App({
    token: config.slack.botToken,
    receiver,
    processBeforeResponse: true,
  });

  receiver.router.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  receiver.router.post("/simulate-message", express.json(), async (request, response) => {
    if (!isSimulationAuthorized(request, config.alerts.simulationSharedSecret)) {
      response.status(401).json({ error: "Unauthorized simulation request." });
      return;
    }

    try {
      const result = await alertService.handleMessage({
        senderId: request.body.senderId,
        senderName: request.body.senderName,
        text: request.body.text,
        channelId: request.body.channelId,
        channelName: request.body.channelName,
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

  slackApp.event("message", async ({ event }) => {
    const result = await alertService.handleMessage({
      senderId: event.user,
      senderName: event.username,
      text: event.text,
      channelId: event.channel,
      subtype: event.subtype,
      isBot: Boolean(event.bot_id),
    });

    if (!result.triggered) {
      logger.info("Slack message did not produce a phone call.", {
        senderId: event.user || null,
        reason: result.reason,
      });
    }
  });

  return {
    app: slackApp,
    receiver,
    start() {
      return slackApp.start(config.server.port);
    },
  };
}
