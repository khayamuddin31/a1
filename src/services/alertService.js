function normalizeSenderKey(senderId) {
  return String(senderId || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function createAlertService({
  watchedSenders,
  watchedUserIds,
  cooldownMs = 0,
  callService,
  logger = console,
  now = Date.now,
}) {
  if (!callService?.placeAlertCall) {
    throw new Error("callService.placeAlertCall is required.");
  }

  const watchedSenderKeys = new Set(
    (watchedSenders || watchedUserIds || []).map(normalizeSenderKey).filter(Boolean),
  );
  const lastAlertBySender = new Map();

  return {
    async handleMessage(event) {
      const senderId = normalizeSenderKey(event?.senderId);
      const text = String(event?.text || "").trim();

      if (!senderId) {
        return { triggered: false, reason: "missing_sender_id" };
      }

      if (!watchedSenderKeys.has(senderId)) {
        return { triggered: false, reason: "sender_not_watched" };
      }

      if (event?.isBot) {
        return { triggered: false, reason: "bot_message" };
      }

      if (event?.subtype) {
        return { triggered: false, reason: "unsupported_subtype" };
      }

      if (!text) {
        return { triggered: false, reason: "empty_text" };
      }

      const timestamp = now();
      const lastAlertTimestamp = lastAlertBySender.get(senderId);

      if (
        typeof lastAlertTimestamp === "number" &&
        cooldownMs > 0 &&
        timestamp - lastAlertTimestamp < cooldownMs
      ) {
        logger.info("Skipped call because sender is inside cooldown window.", {
          senderId,
          cooldownMs,
        });

        return { triggered: false, reason: "cooldown_active" };
      }

      const call = await callService.placeAlertCall({
        ...event,
        senderId,
        text,
      });

      lastAlertBySender.set(senderId, timestamp);
      logger.info("Triggered phone call alert for watched sender.", {
        senderId,
        callSid: call?.sid || null,
      });

      return {
        triggered: true,
        reason: "alert_triggered",
        callSid: call?.sid || null,
      };
    },
  };
}
