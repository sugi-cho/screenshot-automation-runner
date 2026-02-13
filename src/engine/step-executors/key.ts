import { type AutomationAdapter } from "../../adapter/types.js";

export async function executeKeyStep(adapter: AutomationAdapter, keys: string[]): Promise<void> {
  await adapter.key(keys);
}
