import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "playwright";

import { createCallService } from "./services/callService.js";
import { createAlertService } from "./services/alertService.js";
import { createWatchEvent } from "./teamsMessageUtils.js";
import { createTeamsWatcherState } from "./teamsWatcherState.js";

async function collectRawCandidates(page, selectors) {
  return page.evaluate((selectorConfig) => {
    const normalized = {
      messageContainers: selectorConfig.messageContainers || [],
      sender: selectorConfig.sender || [],
      text: selectorConfig.text || [],
      timestamp: selectorConfig.timestamp || [],
    };

    function cleanText(value) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function isVisible(element) {
      const style = window.getComputedStyle(element);

      return (
        style &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getClientRects().length > 0
      );
    }

    function queryText(root, selectorList) {
      for (const selector of selectorList) {
        for (const element of root.querySelectorAll(selector)) {
          const value = cleanText(
            element.innerText || element.textContent || element.getAttribute("aria-label"),
          );

          if (value) {
            return value;
          }
        }
      }

      return "";
    }

    function getLines(root) {
      return cleanText(root.innerText)
        .split(/\n+/)
        .map((line) => cleanText(line))
        .filter(Boolean);
    }

    function inferSender(root) {
      const fromSelectors = queryText(root, normalized.sender);

      if (fromSelectors) {
        return fromSelectors;
      }

      const ariaLabel = cleanText(root.getAttribute("aria-label"));
      const ariaMatch = ariaLabel.match(/^(.+?)\s(?:sent|said|posted|replied)/i);

      if (ariaMatch?.[1]) {
        return ariaMatch[1];
      }

      const lines = getLines(root);
      return lines[0] || "";
    }

    function inferText(root) {
      const fromSelectors = queryText(root, normalized.text);

      if (fromSelectors) {
        return fromSelectors;
      }

      const lines = getLines(root);

      if (lines.length <= 1) {
        return lines[0] || "";
      }

      return lines.slice(1).join(" ");
    }

    function inferTimestamp(root) {
      for (const selector of normalized.timestamp) {
        for (const element of root.querySelectorAll(selector)) {
          const value = cleanText(
            element.getAttribute("datetime") ||
              element.getAttribute("aria-label") ||
              element.innerText ||
              element.textContent,
          );

          if (value) {
            return value;
          }
        }
      }

      return "";
    }

    function inferConversationHint(root) {
      const contextualElement =
        root.closest('[data-tid*="chat-list-item"]') ||
        root.closest('[data-tid*="conversation"]') ||
        root.closest('[aria-selected="true"]');

      return cleanText(
        contextualElement?.getAttribute("aria-label") || contextualElement?.innerText || "",
      );
    }

    const roots = new Set();

    for (const selector of normalized.messageContainers) {
      for (const element of document.querySelectorAll(selector)) {
        roots.add(element);
      }
    }

    return [...roots]
      .filter((root) => isVisible(root))
      .map((root) => ({
        senderName: inferSender(root),
        text: inferText(root),
        timestampLabel: inferTimestamp(root),
        conversationHint: inferConversationHint(root),
      }))
      .filter((candidate) => candidate.senderName && candidate.text)
      .slice(-100);
  }, selectors);
}

export function createTeamsWebWatcher(
  config,
  { logger = console, browserEngine = chromium, callService, alertService } = {},
) {
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
      watchedSenders: config.alerts.watchedSenders,
      cooldownMs: config.alerts.cooldownMs,
      callService: resolvedCallService,
      logger,
    });

  const watcherState = createTeamsWatcherState();
  const profileDirectory = path.resolve(process.cwd(), config.teamsWeb.profileDir);
  let stopped = false;
  let browserContext = null;

  async function processVisibleMessages(page) {
    const pageUrl = page.url();
    const rawCandidates = await collectRawCandidates(page, config.teamsWeb.selectors);
    const candidates = rawCandidates
      .map((candidate) =>
        createWatchEvent({
          ...candidate,
          pageUrl,
        }),
      )
      .filter(Boolean);

    const ingestion = watcherState.ingestCandidates(candidates, pageUrl);

    if (ingestion.isBaseline) {
      logger.info("Established baseline for the current Teams view.", {
        pageUrl,
        visibleCandidates: candidates.length,
      });
      return;
    }

    for (const candidate of ingestion.newCandidates) {
      const result = await resolvedAlertService.handleMessage(candidate);

      if (!result.triggered) {
        logger.info("Ignored detected Teams web message.", {
          senderId: candidate.senderId,
          reason: result.reason,
        });
      }
    }
  }

  return {
    async run() {
      browserContext = await browserEngine.launchPersistentContext(profileDirectory, {
        headless: config.teamsWeb.headless,
        viewport: null,
        ...(config.teamsWeb.channel ? { channel: config.teamsWeb.channel } : {}),
      });

      let page = browserContext.pages()[0];

      if (!page) {
        page = await browserContext.newPage();
      }

      await page.goto(config.teamsWeb.url, { waitUntil: "domcontentloaded" });

      logger.info("Teams web watcher started.", {
        teamsUrl: config.teamsWeb.url,
        profileDirectory,
        headless: config.teamsWeb.headless,
      });
      logger.info(
        "Sign in to Teams in the opened browser if needed, then keep the recent chats view visible.",
      );

      while (!stopped) {
        try {
          await processVisibleMessages(page);
        } catch (error) {
          logger.error("Failed while scanning the Teams web UI.", {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        await delay(config.teamsWeb.pollIntervalMs);
      }
    },

    async close() {
      stopped = true;

      if (browserContext) {
        await browserContext.close();
      }
    },
  };
}
