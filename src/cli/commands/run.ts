import path from "node:path";
import { loadConfig } from "../../config/load.js";
import { validateRunnerConfig } from "../../config/validate.js";
import { ExitCode, RunnerError, toExitCode } from "../../logging/error-codes.js";
import { createArtifactManager } from "../../artifacts/artifact-manager.js";
import { Logger } from "../../logging/logger.js";
import { launchProcess } from "../../launcher/process-manager.js";
import { createPlaywrightCdpAdapter } from "../../adapter/playwright-cdp.js";
import { runScenario } from "../../engine/step-engine.js";

export type RunCommandOptions = {
  configPath: string;
  projectRoot?: string;
  dryRun?: boolean;
  verbose?: boolean;
};

function resolveConfigPath(configPath: string, projectRoot?: string): string {
  if (path.isAbsolute(configPath)) {
    return configPath;
  }
  if (projectRoot) {
    return path.resolve(projectRoot, configPath);
  }
  return path.resolve(process.cwd(), configPath);
}

export async function runRunCommand(options: RunCommandOptions): Promise<number> {
  const configPath = resolveConfigPath(options.configPath, options.projectRoot);
  let processHandle: Awaited<ReturnType<typeof launchProcess>> | undefined;
  let adapter: Awaited<ReturnType<typeof createPlaywrightCdpAdapter>> | undefined;
  let logger: Logger | undefined;

  try {
    const config = await loadConfig(configPath);
    const validated = validateRunnerConfig(config);
    if (!validated.ok) {
      for (const issue of validated.issues) {
        // eslint-disable-next-line no-console
        console.error(`- ${issue.path}: ${issue.message}`);
      }
      return ExitCode.INVALID_CONFIG;
    }

    const artifacts = await createArtifactManager(config);
    logger = new Logger({
      runId: artifacts.runId,
      verbose: options.verbose,
      jsonlPath: artifacts.jsonlPath
    });
    logger.info("Run started", { configPath, dryRun: options.dryRun ?? false });

    if (!options.dryRun) {
      processHandle = await launchProcess(config.launch, logger);
      adapter = await createPlaywrightCdpAdapter(
        {
          cdpPort: config.automation.cdpPort,
          connectTimeoutMs: config.automation.connectTimeoutMs,
          viewport: config.automation.viewport
        },
        logger
      );
    }

    const result = await runScenario({
      config,
      scenario: config.scenario,
      logger,
      artifacts,
      adapter,
      dryRun: options.dryRun ?? false
    });

    if (!result.success) {
      logger.error("Scenario failed");
      return ExitCode.STEP_EXECUTION_FAILED;
    }

    logger.info("Scenario completed");
    return ExitCode.SUCCESS;
  } catch (error) {
    if (logger) {
      logger.error("Run failed", {
        error: String(error),
        code: error instanceof RunnerError ? error.code : ExitCode.UNEXPECTED
      });
    } else {
      // eslint-disable-next-line no-console
      console.error(String(error));
    }
    return toExitCode(error);
  } finally {
    try {
      if (adapter?.close) {
        await adapter.close();
      }
      if (processHandle) {
        await processHandle.stop();
      }
    } catch (cleanupError) {
      // eslint-disable-next-line no-console
      console.error(`Cleanup error: ${String(cleanupError)}`);
      return ExitCode.CLEANUP_FAILED;
    }
  }
}
