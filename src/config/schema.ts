export type LaunchConfig =
  | {
      type: "command";
      command: string;
      cwd?: string;
      env?: Record<string, string>;
      shell?: "powershell" | "bash";
    }
  | {
      type: "binary";
      executable: string;
      args?: string[];
      cwd?: string;
      env?: Record<string, string>;
    };

export type WaitCondition =
  | { kind: "windowTitle"; contains: string }
  | { kind: "text"; contains: string; selector?: string }
  | { kind: "selector"; selector: string; state?: "attached" | "visible" | "hidden" | "detached" }
  | { kind: "timeout"; ms: number };

export type ConditionExpr =
  | { op: "exists"; selector: string }
  | { op: "textContains"; text: string; selector?: string }
  | { op: "not"; expr: ConditionExpr };

export type RetryPolicy = {
  attempts: number;
  intervalMs: number;
  backoff?: "fixed" | "exponential";
};

export type BaseStep = {
  id: string;
  timeoutMs?: number;
  retry?: RetryPolicy;
  when?: ConditionExpr;
  onError?: "abort" | "continue";
};

export type Step =
  | (BaseStep & { type: "wait"; until: WaitCondition })
  | (BaseStep & { type: "click"; selector: string; button?: "left" | "right"; clickCount?: number })
  | (BaseStep & { type: "input"; selector: string; value: string; clear?: boolean })
  | (BaseStep & { type: "key"; keys: string[] })
  | (BaseStep & { type: "screenshot"; name: string; fullPage?: boolean });

export type Scenario = {
  name: string;
  description?: string;
  startupWait?: WaitCondition[];
  steps: Step[];
  outputDir?: string;
};

export type RunnerConfig = {
  version: 1;
  project: string;
  launch: LaunchConfig;
  automation: {
    adapter: "playwright-cdp";
    cdpPort: number;
    connectTimeoutMs: number;
    viewport: { width: number; height: number };
    headless?: boolean;
  };
  output: {
    dir: string;
    fileNameTemplate: string;
    overwrite: boolean;
  };
  defaults?: {
    stepTimeoutMs?: number;
    retry?: RetryPolicy;
    globalTimeoutMs?: number;
  };
  scenario: Scenario;
};
