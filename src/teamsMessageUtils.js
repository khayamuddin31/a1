export function normalizeSenderName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSenderKey(value) {
  return normalizeSenderName(value).toLowerCase();
}

export function normalizeMessageText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeTimestamp(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function createMessageFingerprint(message) {
  const senderKey = normalizeSenderKey(message.senderName || message.senderId);
  const text = normalizeMessageText(message.text);
  const timestamp = sanitizeTimestamp(message.timestampLabel);
  const location = normalizeMessageText(message.pageUrl || message.conversationHint || "");

  return [senderKey, text, timestamp, location].filter(Boolean).join("::");
}

export function createWatchEvent(rawMessage) {
  const senderName = normalizeSenderName(rawMessage.senderName);
  const senderId = normalizeSenderKey(senderName || rawMessage.senderId);
  const text = normalizeMessageText(rawMessage.text);

  if (!senderId || !text) {
    return null;
  }

  return {
    senderId,
    senderName: senderName || rawMessage.senderId || rawMessage.senderName,
    text,
    timestampLabel: sanitizeTimestamp(rawMessage.timestampLabel),
    conversationHint: normalizeMessageText(rawMessage.conversationHint),
    pageUrl: rawMessage.pageUrl || null,
    fingerprint: createMessageFingerprint({
      ...rawMessage,
      senderId,
      senderName,
      text,
    }),
  };
}
