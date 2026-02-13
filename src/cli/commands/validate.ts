import { loadConfig } from "../../config/load.js";
import { validateRunnerConfig } from "../../config/validate.js";
import { ExitCode } from "../../logging/error-codes.js";

export async function runValidateCommand(configPath: string): Promise<number> {
  try {
    const config = await loadConfig(configPath);
    const result = validateRunnerConfig(config);

    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.error("Config is invalid:");
      for (const issue of result.issues) {
        // eslint-disable-next-line no-console
        console.error(`- ${issue.path}: ${issue.message}`);
      }
      return ExitCode.INVALID_CONFIG;
    }

    // eslint-disable-next-line no-console
    console.log("Config is valid.");
    return ExitCode.SUCCESS;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Config is invalid: ${String(error)}`);
    return ExitCode.INVALID_CONFIG;
  }
}
