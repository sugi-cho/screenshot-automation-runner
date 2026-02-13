import { type AutomationAdapter } from "../../adapter/types.js";

export async function executeInputStep(
  adapter: AutomationAdapter,
  selector: string,
  value: string,
  options?: { clear?: boolean }
): Promise<void> {
  await adapter.input(selector, value, options);
}
