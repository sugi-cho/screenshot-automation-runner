import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { ExitCode, RunnerError } from "../logging/error-codes.js";
import { type WaitCondition } from "../config/schema.js";
import { type Logger } from "../logging/logger.js";
import { type AutomationAdapter } from "./types.js";

type PlaywrightCDPOptions = {
  cdpPort: number;
  connectTimeoutMs: number;
  viewport: { width: number; height: number };
};

export async function createPlaywrightCdpAdapter(
  options: PlaywrightCDPOptions,
  logger: Logger
): Promise<AutomationAdapter> {
  const endpoint = `http://127.0.0.1:${options.cdpPort}`;
  let browser: Browser;
  const deadline = Date.now() + options.connectTimeoutMs;
  let lastError: unknown;

  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RunnerError(ExitCode.CDP_CONNECT_FAILED, `CDP connect failed: ${String(lastError)}`, {
        endpoint
      });
    }

    try {
      browser = await chromium.connectOverCDP(endpoint, {
        timeout: Math.min(remaining, 3_000)
      });
      break;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  const context: BrowserContext =
    browser.contexts()[0] ??
    (await browser.newContext({
      viewport: options.viewport
    }));

  const page: Page = context.pages()[0] ?? (await context.newPage());

  try {
    await page.setViewportSize(options.viewport);
  } catch {
    // Some CDP targets do not allow dynamic viewport update.
  }

  logger.info("CDP connected", {
    endpoint,
    width: options.viewport.width,
    height: options.viewport.height
  });

  async function waitFor(condition: WaitCondition, timeoutMs: number): Promise<void> {
    switch (condition.kind) {
      case "windowTitle":
        await page.waitForFunction(
          (contains) => document.title.includes(contains),
          condition.contains,
          { timeout: timeoutMs }
        );
        return;
      case "text":
        if (condition.selector) {
          await page
            .locator(condition.selector)
            .filter({ hasText: condition.contains })
            .first()
            .waitFor({ state: "visible", timeout: timeoutMs });
          return;
        }
        await page.getByText(condition.contains, { exact: false }).first().waitFor({
          state: "visible",
          timeout: timeoutMs
        });
        return;
      case "selector":
        await page.locator(condition.selector).first().waitFor({
          state: condition.state ?? "visible",
          timeout: timeoutMs
        });
        return;
      case "timeout":
        await delay(condition.ms);
        return;
      default:
        throw new RunnerError(ExitCode.WAIT_TIMEOUT, "Unsupported wait condition");
    }
  }

  return {
    waitFor,
    async click(selector, stepOptions) {
      await page.locator(selector).first().click({
        button: stepOptions?.button,
        clickCount: stepOptions?.clickCount
      });
    },
    async input(selector, value, stepOptions) {
      const target = page.locator(selector).first();
      if (stepOptions?.clear === false) {
        await target.click();
        await target.type(value);
        return;
      }
      await target.fill(value);
    },
    async key(keys) {
      if (keys.length === 0) {
        return;
      }
      if (keys.length === 1) {
        await page.keyboard.press(keys[0]);
        return;
      }
      await page.keyboard.press(keys.join("+"));
    },
    async screenshot(filePath, screenshotOptions) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await page.screenshot({
        path: filePath,
        fullPage: screenshotOptions?.fullPage ?? false
      });
    },
    async content() {
      return page.content();
    },
    async evaluateCondition(selector) {
      const count = await page.locator(selector).count();
      return count > 0;
    },
    async close() {
      await browser.close();
    }
  };
}
