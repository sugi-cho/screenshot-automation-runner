import { RunnerError, ExitCode } from "../logging/error-codes.js";
import { type AutomationAdapter } from "./types.js";
import { type Logger } from "../logging/logger.js";

type PlaywrightCDPOptions = {
  cdpPort: number;
  connectTimeoutMs: number;
  viewport: { width: number; height: number };
};

export async function createPlaywrightCdpAdapter(
  _options: PlaywrightCDPOptions,
  _logger: Logger
): Promise<AutomationAdapter> {
  throw new RunnerError(
    ExitCode.CDP_CONNECT_FAILED,
    "playwright-cdp adapter is not available in this offline runtime. Use --dry-run for validation."
  );
}
