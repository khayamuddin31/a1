# Team Message Call Alerts

Node.js service that listens for Slack messages and places an automated phone call whenever a watched person sends a new message.

## What it does

- Receives Slack `message` events through the Slack Events API.
- Filters messages so only selected Slack user IDs trigger alerts.
- Calls a destination phone number using Twilio Voice.
- Applies a cooldown per watched sender to prevent repeated calls for every rapid-fire message.
- Exposes:
  - `GET /health` for uptime checks
  - `POST /simulate-message` for safe local testing without a live Slack workspace

## Architecture

1. Slack sends a message event to this app.
2. The app checks whether the sender is in `WATCHED_USER_IDS`.
3. If the sender is watched and not in cooldown, the app places a Twilio call to `ALERT_TO_NUMBER`.
4. The spoken call message includes the sender and a short preview of the message body.

## Requirements

- Node.js 20+
- A Slack app with an Events API endpoint
- A Twilio account with a voice-capable phone number

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
PORT=3000
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
WATCHED_USER_IDS=U01234567,U07654321
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+15551234567
ALERT_TO_NUMBER=+15557654321
CALL_COOLDOWN_SECONDS=300
SIMULATION_SHARED_SECRET=optional-shared-secret
```

### Important environment variables

- `WATCHED_USER_IDS`: comma-separated Slack user IDs that should trigger phone alerts
- `ALERT_TO_NUMBER`: destination number that receives the phone call
- `CALL_COOLDOWN_SECONDS`: per-user delay before the same sender can trigger another call
- `SIMULATION_SHARED_SECRET`: optional header value required by `/simulate-message`

## Slack app configuration

Create a Slack app and enable the Events API.

### Bot token scopes

Add at least:

- `channels:history`
- `groups:history`
- `im:history`
- `mpim:history`

If you want the app to receive messages in channels, also invite the bot to those channels where needed.

### Event subscriptions

Subscribe to:

- `message.channels`
- `message.groups`
- `message.im`
- `message.mpim`

Set the Request URL to your deployed service URL, for example:

```text
https://your-domain.example/slack/events
```

Bolt's default Slack receiver handles the `/slack/events` endpoint automatically.

## Run locally

```bash
npm start
```

You should see the service start on the configured port.

## Local simulation

You can trigger the alert logic without Slack by calling the simulation endpoint:

```bash
curl -X POST http://localhost:3000/simulate-message \
  -H "Content-Type: application/json" \
  -H "x-simulation-secret: optional-shared-secret" \
  -d '{
    "senderId": "U01234567",
    "senderName": "Alice",
    "text": "Production database latency is increasing."
  }'
```

If `senderId` is listed in `WATCHED_USER_IDS`, the service places a Twilio phone call.

## Test

```bash
npm test
```

## Notes

- This implementation uses Slack as the team messaging platform because it provides a straightforward event-driven API for Node.js services.
- The spoken alert uses Twilio's built-in TwiML response and the default `alice` voice.
- Message edits, deletions, bot messages, and empty messages are ignored.