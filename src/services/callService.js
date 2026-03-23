import twilio from "twilio";

const { twiml: TwiML } = twilio;

function sanitizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

export function buildVoiceMessage(event) {
  const senderName = event.senderName || event.senderId || "A watched sender";
  const preview = truncateText(sanitizeText(event.text) || "No message body was provided.", 180);

  return `Alert. ${senderName} sent a new team message. Message preview: ${preview}. Please check Slack now.`;
}

export function createCallService({
  accountSid,
  authToken,
  fromNumber,
  toNumber,
  client,
} = {}) {
  const twilioClient = client ?? twilio(accountSid, authToken);

  return {
    async placeAlertCall(event) {
      const response = new TwiML.VoiceResponse();
      response.say({ voice: "alice" }, buildVoiceMessage(event));

      return twilioClient.calls.create({
        from: fromNumber,
        to: toNumber,
        twiml: response.toString(),
      });
    },
  };
}
