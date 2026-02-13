import { type AutomationAdapter } from "../../adapter/types.js";

export async function executeClickStep(
  adapter: AutomationAdapter,
  selector: string,
  options?: { button?: "left" | "right"; clickCount?: number }
): Promise<void> {
  await adapter.click(selector, options);
}
