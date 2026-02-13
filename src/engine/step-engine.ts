import { ExitCode, RunnerError } from "../logging/error-codes.js";
import { type Logger } from "../logging/logger.js";
import {
  type RunnerConfig,
  type Scenario,
  type Step,
  type ConditionExpr,
  type RetryPolicy,
  type WaitCondition
} from "../config/schema.js";
import { withTimeout } from "../utils/timeout.js";
import { withRetry } from "../utils/retry.js";
import { type AutomationAdapter } from "../adapter/types.js";
import { executeWaitStep } from "./step-executors/wait.js";
import { executeClickStep } from "./step-executors/click.js";
import { executeInputStep } from "./step-executors/input.js";
import { executeKeyStep } from "./step-executors/key.js";
import { executeScreenshotStep } from "./step-executors/screenshot.js";
import { type ArtifactManager } from "../artifacts/artifact-manager.js";

export type StepStatus = "success" | "failed" | "skipped";

export type StepResult = {
  id: string;
  type: string;
  status: StepStatus;
  durationMs: number;
  error?: string;
  screenshot?: string;
};

export type ScenarioResult = {
  success: boolean;
  steps: StepResult[];
};

type StepEngineOptions = {
  config: RunnerConfig;
  scenario: Scenario;
  logger: Logger;
  artifacts: ArtifactManager;
  adapter?: AutomationAdapter;
  dryRun?: boolean;
};

function mergedRetry(defaults: RetryPolicy | undefined, step: Step): RetryPolicy {
  return step.retry ?? defaults ?? { attempts: 1, intervalMs: 0, backoff: "fixed" };
}

function stepTimeout(defaultTimeoutMs: number | undefined, step: Step): number {
  return step.timeoutMs ?? defaultTimeoutMs ?? 10_000;
}

async function evaluateCondition(adapter: AutomationAdapter | undefined, expr: ConditionExpr | undefined): Promise<boolean> {
  if (!expr) return true;
  if (!adapter) return true;
  if (!adapter.evaluateCondition) return true;

  switch (expr.op) {
    case "exists":
      return adapter.evaluateCondition(expr.selector);
    case "textContains":
      return adapter.evaluateCondition(expr.selector ?? `text=${expr.text}`);
    case "not":
      return !(await evaluateCondition(adapter, expr.expr));
    default:
      return true;
  }
}

async function runWaitConditionIfNeeded(
  adapter: AutomationAdapter | undefined,
  logger: Logger,
  condition: WaitCondition,
  timeoutMs: number
): Promise<void> {
  if (!adapter) {
    logger.info("Dry-run wait", { condition });
    return;
  }
  await executeWaitStep(adapter, condition, timeoutMs);
}

async function executeSingleStep(
  options: StepEngineOptions,
  step: Step
): Promise<{ result: StepResult; abort: boolean }> {
  const startedAt = Date.now();
  const timeoutMs = stepTimeout(options.config.defaults?.stepTimeoutMs, step);
  const retry = mergedRetry(options.config.defaults?.retry, step);

  if (!(await evaluateCondition(options.adapter, step.when))) {
    return {
      result: {
        id: step.id,
        type: step.type,
        status: "skipped",
        durationMs: Date.now() - startedAt
      },
      abort: false
    };
  }

  const run = async (): Promise<StepResult> => {
    if (options.dryRun) {
      if (step.type === "screenshot") {
        const next = await options.artifacts.nextScreenshotPath(step.name);
        options.logger.info("Dry-run screenshot planned", { stepId: step.id, filePath: next.filePath });
      } else {
        options.logger.info("Dry-run step", { stepId: step.id, type: step.type });
      }
      return {
        id: step.id,
        type: step.type,
        status: "success",
        durationMs: Date.now() - startedAt
      };
    }

    if (!options.adapter) {
      throw new RunnerError(ExitCode.STEP_EXECUTION_FAILED, "Adapter is required for non dry-run execution");
    }

    switch (step.type) {
      case "wait":
        await executeWaitStep(options.adapter, step.until, timeoutMs);
        return { id: step.id, type: step.type, status: "success", durationMs: Date.now() - startedAt };
      case "click":
        await executeClickStep(options.adapter, step.selector, {
          button: step.button,
          clickCount: step.clickCount
        });
        return { id: step.id, type: step.type, status: "success", durationMs: Date.now() - startedAt };
      case "input":
        await executeInputStep(options.adapter, step.selector, step.value, { clear: step.clear });
        return { id: step.id, type: step.type, status: "success", durationMs: Date.now() - startedAt };
      case "key":
        await executeKeyStep(options.adapter, step.keys);
        return { id: step.id, type: step.type, status: "success", durationMs: Date.now() - startedAt };
      case "screenshot": {
        const next = await options.artifacts.nextScreenshotPath(step.name);
        await executeScreenshotStep(options.adapter, next.filePath, { fullPage: step.fullPage });
        return {
          id: step.id,
          type: step.type,
          status: "success",
          durationMs: Date.now() - startedAt,
          screenshot: next.filePath
        };
      }
      default:
        throw new RunnerError(ExitCode.STEP_EXECUTION_FAILED, `Unsupported step type: ${(step as Step).type}`);
    }
  };

  try {
    const result = await withRetry(() => withTimeout(run(), timeoutMs, "step timeout"), retry);
    options.logger.info("Step succeeded", {
      stepId: step.id,
      type: step.type,
      durationMs: result.durationMs
    });
    return { result, abort: false };
  } catch (error) {
    const message = String(error);
    options.logger.error("Step failed", { stepId: step.id, type: step.type, error: message });
    await options.artifacts.saveFailureArtifacts(step.id, options.adapter);

    const failed: StepResult = {
      id: step.id,
      type: step.type,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: message
    };

    const onError = step.onError ?? "abort";
    return { result: failed, abort: onError === "abort" };
  }
}

export async function runScenario(options: StepEngineOptions): Promise<ScenarioResult> {
  const results: StepResult[] = [];
  const startupWait = options.scenario.startupWait ?? [];
  for (const condition of startupWait) {
    await runWaitConditionIfNeeded(options.adapter, options.logger, condition, options.config.defaults?.stepTimeoutMs ?? 30_000);
  }

  for (const step of options.scenario.steps) {
    const { result, abort } = await executeSingleStep(options, step);
    results.push(result);
    if (abort) {
      return { success: false, steps: results };
    }
  }

  const success = results.every((r) => r.status !== "failed");
  return { success, steps: results };
}
