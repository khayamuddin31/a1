const EDIT_EVENT_TYPES = new Set(["editMessage", "undeleteMessage", "deleteMessage"]);

function normalizeText(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text.replace(/<at>.*?<\/at>/g, " ").replace(/\s+/g, " ").trim();
}

function getSenderId(activity) {
  return activity?.from?.aadObjectId || activity?.from?.id || "";
}

export function extractTeamsMessageEvent(activity) {
  if (activity?.type !== "message") {
    return null;
  }

  const senderId = getSenderId(activity);

  if (!senderId) {
    return null;
  }

  const eventType = activity?.channelData?.eventType;

  return {
    senderId,
    senderName: activity?.from?.name || senderId,
    text: normalizeText(activity?.text),
    channelId: activity?.channelId || null,
    conversationId: activity?.conversation?.id || null,
    isBot: activity?.from?.role === "bot",
    subtype: EDIT_EVENT_TYPES.has(eventType) ? eventType : null,
  };
}
