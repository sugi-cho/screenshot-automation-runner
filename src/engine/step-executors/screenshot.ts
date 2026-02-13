import { type AutomationAdapter } from "../../adapter/types.js";

export async function executeScreenshotStep(
  adapter: AutomationAdapter,
  path: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await adapter.screenshot(path, options);
}
