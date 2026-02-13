import { type RunnerConfig, type Step, type WaitCondition } from "./schema.js";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isWaitCondition(value: unknown): value is WaitCondition {
  if (!isObject(value) || !isNonEmptyString(value.kind)) return false;
  if (value.kind === "windowTitle") return isNonEmptyString(value.contains);
  if (value.kind === "text") return isNonEmptyString(value.contains);
  if (value.kind === "selector") return isNonEmptyString(value.selector);
  if (value.kind === "timeout") return typeof value.ms === "number" && value.ms >= 0;
  return false;
}

function validateStep(step: unknown, index: number, issues: ValidationIssue[]): step is Step {
  const basePath = `scenario.steps[${index}]`;
  if (!isObject(step)) {
    issues.push({ path: basePath, message: "step must be object" });
    return false;
  }

  if (!isNonEmptyString(step.id)) {
    issues.push({ path: `${basePath}.id`, message: "id is required" });
  }
  if (!isNonEmptyString(step.type)) {
    issues.push({ path: `${basePath}.type`, message: "type is required" });
    return false;
  }

  switch (step.type) {
    case "wait":
      if (!isWaitCondition(step.until)) {
        issues.push({ path: `${basePath}.until`, message: "invalid wait condition" });
      }
      break;
    case "click":
      if (!isNonEmptyString(step.selector)) {
        issues.push({ path: `${basePath}.selector`, message: "selector is required" });
      }
      break;
    case "input":
      if (!isNonEmptyString(step.selector)) {
        issues.push({ path: `${basePath}.selector`, message: "selector is required" });
      }
      if (typeof step.value !== "string") {
        issues.push({ path: `${basePath}.value`, message: "value must be string" });
      }
      break;
    case "key":
      if (!Array.isArray(step.keys) || step.keys.some((k) => !isNonEmptyString(k))) {
        issues.push({ path: `${basePath}.keys`, message: "keys must be string array" });
      }
      break;
    case "screenshot":
      if (!isNonEmptyString(step.name)) {
        issues.push({ path: `${basePath}.name`, message: "name is required" });
      }
      break;
    default:
      issues.push({ path: `${basePath}.type`, message: `unsupported step type: ${String(step.type)}` });
  }

  if (
    step.retry !== undefined &&
    (!isObject(step.retry) ||
      typeof step.retry.attempts !== "number" ||
      step.retry.attempts < 1 ||
      typeof step.retry.intervalMs !== "number" ||
      step.retry.intervalMs < 0)
  ) {
    issues.push({ path: `${basePath}.retry`, message: "retry must include attempts>=1 and intervalMs>=0" });
  }

  return true;
}

export function validateRunnerConfig(config: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isObject(config)) {
    return { ok: false, issues: [{ path: "$", message: "config must be object" }] };
  }

  if (config.version !== 1) issues.push({ path: "version", message: "version must be 1" });
  if (!isNonEmptyString(config.project)) issues.push({ path: "project", message: "project is required" });

  if (!isObject(config.launch)) {
    issues.push({ path: "launch", message: "launch is required" });
  } else if (config.launch.type === "command") {
    if (!isNonEmptyString(config.launch.command)) {
      issues.push({ path: "launch.command", message: "command is required" });
    }
  } else if (config.launch.type === "binary") {
    if (!isNonEmptyString(config.launch.executable)) {
      issues.push({ path: "launch.executable", message: "executable is required" });
    }
  } else {
    issues.push({ path: "launch.type", message: "launch.type must be command or binary" });
  }

  if (!isObject(config.automation)) {
    issues.push({ path: "automation", message: "automation is required" });
  } else {
    if (config.automation.adapter !== "playwright-cdp") {
      issues.push({ path: "automation.adapter", message: "adapter must be playwright-cdp" });
    }
    if (typeof config.automation.cdpPort !== "number") {
      issues.push({ path: "automation.cdpPort", message: "cdpPort must be number" });
    }
    if (typeof config.automation.connectTimeoutMs !== "number") {
      issues.push({ path: "automation.connectTimeoutMs", message: "connectTimeoutMs must be number" });
    }
    if (
      !isObject(config.automation.viewport) ||
      typeof config.automation.viewport.width !== "number" ||
      typeof config.automation.viewport.height !== "number"
    ) {
      issues.push({ path: "automation.viewport", message: "viewport width/height must be numbers" });
    }
  }

  if (!isObject(config.output)) {
    issues.push({ path: "output", message: "output is required" });
  } else {
    if (!isNonEmptyString(config.output.dir)) issues.push({ path: "output.dir", message: "output.dir is required" });
    if (!isNonEmptyString(config.output.fileNameTemplate)) {
      issues.push({ path: "output.fileNameTemplate", message: "output.fileNameTemplate is required" });
    }
    if (typeof config.output.overwrite !== "boolean") {
      issues.push({ path: "output.overwrite", message: "output.overwrite must be boolean" });
    }
  }

  if (!isObject(config.scenario)) {
    issues.push({ path: "scenario", message: "scenario is required" });
  } else {
    if (!isNonEmptyString(config.scenario.name)) {
      issues.push({ path: "scenario.name", message: "scenario.name is required" });
    }
    if (!Array.isArray(config.scenario.steps) || config.scenario.steps.length === 0) {
      issues.push({ path: "scenario.steps", message: "scenario.steps must be non-empty array" });
    } else {
      for (let i = 0; i < config.scenario.steps.length; i += 1) {
        validateStep(config.scenario.steps[i], i, issues);
      }
    }
    if (config.scenario.startupWait !== undefined) {
      if (!Array.isArray(config.scenario.startupWait)) {
        issues.push({ path: "scenario.startupWait", message: "startupWait must be array" });
      } else if (config.scenario.startupWait.some((item) => !isWaitCondition(item))) {
        issues.push({ path: "scenario.startupWait", message: "startupWait contains invalid condition" });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function assertValidConfig(config: unknown): asserts config is RunnerConfig {
  const result = validateRunnerConfig(config);
  if (!result.ok) {
    const formatted = result.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(formatted);
  }
}
