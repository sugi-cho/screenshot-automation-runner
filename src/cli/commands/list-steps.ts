import { loadConfig } from "../../config/load.js";
import { validateRunnerConfig } from "../../config/validate.js";
import { ExitCode } from "../../logging/error-codes.js";

export async function runListStepsCommand(configPath: string): Promise<number> {
  try {
    const config = await loadConfig(configPath);
    const valid = validateRunnerConfig(config);
    if (!valid.ok) {
      // eslint-disable-next-line no-console
      console.error("Invalid config. Use `sar validate` first.");
      return ExitCode.INVALID_CONFIG;
    }

    config.scenario.steps.forEach((step, index) => {
      const suffix = step.type === "screenshot" ? ` (${step.name})` : "";
      // eslint-disable-next-line no-console
      console.log(`${String(index + 1).padStart(2, "0")}. ${step.id} [${step.type}]${suffix}`);
    });

    return ExitCode.SUCCESS;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(String(error));
    return ExitCode.INVALID_CONFIG;
  }
}
