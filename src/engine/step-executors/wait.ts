import { type WaitCondition } from "../../config/schema.js";
import { type AutomationAdapter } from "../../adapter/types.js";

export async function executeWaitStep(
  adapter: AutomationAdapter,
  condition: WaitCondition,
  timeoutMs: number
): Promise<void> {
  await adapter.waitFor(condition, timeoutMs);
}
