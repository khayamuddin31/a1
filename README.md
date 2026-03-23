# Team Message Call Alerts

Node.js tool that watches the Microsoft Teams web app in a local browser session and places an automated phone call whenever a watched person sends a visible new message.

This version is designed for environments where you **cannot use**:

- Azure / Entra app registration
- Microsoft Graph subscriptions
- Teams bot registration
- admin consent

Instead of using Microsoft APIs, it watches the **Teams web UI** with Playwright.

## What it does

- launches a persistent browser profile with the Teams web app
- lets you sign in with your normal Teams account
- scans visible Teams message elements for new messages
- matches sender display names against a configured watch list
- places a Twilio voice call to a destination phone number
- applies a cooldown per watched sender to avoid repeated calls

## How it works

1. The app opens `teams.microsoft.com` in a persistent browser profile.
2. You sign in manually if needed.
3. The watcher repeatedly scans the visible Teams UI for message-like elements.
4. Newly detected messages are normalized and matched against `WATCHED_SENDERS`.
5. If a watched sender appears, the app places a Twilio phone call.

## Important limitations

This approach avoids Microsoft admin setup, but it is inherently less reliable than official APIs.

- It must run on a machine where a user can log in to Teams.
- It depends on the Teams web DOM, which Microsoft can change at any time.
- It works best when the Teams browser window is left on the recent chats / active conversation view.
- It may miss messages if the relevant UI is not visible.
- It may require selector tuning if Teams changes its markup.

## Requirements

- Node.js 20+
- A Twilio account with a voice-capable phone number
- Access to Teams through the web app in a browser profile you can keep signed in

## Setup

```bash
npm install
cp .env.example .env
```

If you want Playwright's bundled browser, install it once:

```bash
npm run install:browsers
```

If you prefer to use locally installed Microsoft Edge, keep `BROWSER_CHANNEL=msedge` in `.env`.

Fill in `.env`:

```env
TEAMS_WEB_URL=https://teams.microsoft.com/v2/
BROWSER_PROFILE_DIR=.teams-browser-profile
BROWSER_CHANNEL=msedge
HEADLESS=false
POLL_INTERVAL_SECONDS=5
WATCHED_SENDERS=Alice Smith,Bob Jones
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+15551234567
ALERT_TO_NUMBER=+15557654321
CALL_COOLDOWN_SECONDS=300
```

## Important environment variables

- `WATCHED_SENDERS`: comma-separated display names to watch, matched case-insensitively
- `BROWSER_PROFILE_DIR`: persistent browser profile directory so your Teams login can survive restarts
- `BROWSER_CHANNEL`: optional Playwright browser channel, for example `msedge` or `chrome`
- `HEADLESS`: `false` is recommended so you can sign in and verify the UI being watched
- `POLL_INTERVAL_SECONDS`: how often the Teams page is scanned
- `ALERT_TO_NUMBER`: destination number that receives the phone call
- `CALL_COOLDOWN_SECONDS`: per-sender delay before another call is allowed

## Advanced selector overrides

If Microsoft changes the Teams DOM, you can override the default CSS selectors with comma-separated values:

- `TEAMS_MESSAGE_CONTAINER_SELECTORS`
- `TEAMS_SENDER_SELECTORS`
- `TEAMS_TEXT_SELECTORS`
- `TEAMS_TIMESTAMP_SELECTORS`

These are optional and only needed if the built-in heuristics stop matching your Teams UI.

## Run locally

```bash
npm start
```

When the browser opens:

1. sign in to Microsoft Teams if prompted
2. keep Teams on the recent chats list or the conversation view you want to monitor
3. leave the watcher running

The first visible set of messages is treated as a baseline, so the watcher only alerts on messages detected after startup or after the Teams route changes.

## Test

```bash
npm test
```

## Notes

- The spoken alert uses Twilio's built-in TwiML response and the default `alice` voice.
- Sender matching is based on visible display names from the Teams web UI, not stable Azure IDs.
- This is a local automation workaround, not an official Microsoft Teams integration.