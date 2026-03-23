# Team Message Call Alerts

Node.js service that listens for Microsoft Teams messages and places an automated phone call whenever a watched person sends a new message.

## What it does

- Receives Microsoft Teams bot message activities at `/api/messages`.
- Filters messages so only selected Teams users trigger alerts.
- Calls a destination phone number using Twilio Voice.
- Applies a cooldown per watched sender to avoid repeated calls for rapid-fire messages.
- Exposes:
  - `GET /health` for uptime checks
  - `POST /simulate-message` for safe local testing without a live Teams tenant

## Architecture

1. Microsoft Teams sends a bot message activity to this app.
2. The app extracts the sender identity from the activity (`from.aadObjectId` first, then `from.id` as fallback).
3. The app checks whether the sender is in `WATCHED_TEAMS_USER_IDS`.
4. If the sender is watched and not in cooldown, the app places a Twilio call to `ALERT_TO_NUMBER`.
5. The spoken call message includes the sender and a short preview of the message body.

## Requirements

- Node.js 20+
- A Microsoft Teams bot registration in Azure / Microsoft Bot Framework
- A Twilio account with a voice-capable phone number

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
PORT=3000
MicrosoftAppId=your-microsoft-app-id
MicrosoftAppPassword=your-microsoft-app-password
MicrosoftAppType=MultiTenant
MicrosoftAppTenantId=
WATCHED_TEAMS_USER_IDS=8:orgid:11111111-2222-3333-4444-555555555555,8:orgid:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+15551234567
ALERT_TO_NUMBER=+15557654321
CALL_COOLDOWN_SECONDS=300
SIMULATION_SHARED_SECRET=optional-shared-secret
```

### Important environment variables

- `WATCHED_TEAMS_USER_IDS`: comma-separated Teams user identifiers to watch
- `MicrosoftAppId` / `MicrosoftAppPassword`: Teams bot credentials
- `MicrosoftAppType`: typically `MultiTenant` unless your bot registration requires another setting
- `MicrosoftAppTenantId`: optional tenant ID, commonly used for single-tenant bots
- `ALERT_TO_NUMBER`: destination number that receives the phone call
- `CALL_COOLDOWN_SECONDS`: per-user delay before the same sender can trigger another call
- `SIMULATION_SHARED_SECRET`: optional header value required by `/simulate-message`

## Microsoft Teams bot configuration

Create or configure a Teams bot registration and point its messaging endpoint to:

```text
https://your-domain.example/api/messages
```

### Bot behavior

For this service to receive messages:

- the bot must be installed in the chat, group chat, or team
- users must send messages in a scope where the bot is present
- the hosting endpoint must be publicly reachable by Microsoft Teams

### Choosing watched user IDs

The service matches users using the Teams activity sender:

1. `from.aadObjectId`
2. `from.id` if `aadObjectId` is not present

In most environments, using Azure AD object IDs is the most stable option. You can inspect incoming payloads during setup or temporarily log sender data to confirm the identifiers for the people you want to watch.

## Run locally

```bash
npm start
```

You should see the service start on the configured port.

## Local simulation

You can trigger the alert logic without Teams by calling the simulation endpoint:

```bash
curl -X POST http://localhost:3000/simulate-message \
  -H "Content-Type: application/json" \
  -H "x-simulation-secret: optional-shared-secret" \
  -d '{
    "senderId": "8:orgid:11111111-2222-3333-4444-555555555555",
    "senderName": "Alice",
    "text": "Production database latency is increasing."
  }'
```

If `senderId` is listed in `WATCHED_TEAMS_USER_IDS`, the service places a Twilio phone call.

## Test

```bash
npm test
```

## Notes

- The spoken alert uses Twilio's built-in TwiML response and the default `alice` voice.
- Message edits, deletions, bot messages, and empty messages are ignored.
- This project targets Microsoft Teams message activities delivered through a bot endpoint.