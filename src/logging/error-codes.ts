export enum ExitCode {
  SUCCESS = 0,
  INVALID_CONFIG = 10,
  APP_LAUNCH_FAILED = 20,
  CDP_CONNECT_FAILED = 21,
  WAIT_TIMEOUT = 30,
  STEP_EXECUTION_FAILED = 31,
  SCREENSHOT_SAVE_FAILED = 32,
  CLEANUP_FAILED = 40,
  UNEXPECTED = 50
}

export class RunnerError extends Error {
  code: ExitCode;
  details?: Record<string, unknown>;

  constructor(code: ExitCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "RunnerError";
    this.code = code;
    this.details = details;
  }
}

export function toExitCode(error: unknown): ExitCode {
  if (error instanceof RunnerError) {
    return error.code;
  }
  return ExitCode.UNEXPECTED;
}
