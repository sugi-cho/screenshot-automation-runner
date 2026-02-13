import { spawn, type ChildProcess } from "node:child_process";
import { RunnerError, ExitCode } from "../logging/error-codes.js";
import { type LaunchConfig } from "../config/schema.js";
import { type Logger } from "../logging/logger.js";
import { killProcessTree } from "../utils/cleanup.js";

export type ManagedProcess = {
  child: ChildProcess;
  stop: () => Promise<void>;
};

function shellFor(): string {
  if (process.platform === "win32") {
    return "powershell";
  }
  return "bash";
}

export async function launchProcess(config: LaunchConfig, logger: Logger): Promise<ManagedProcess> {
  let child: ChildProcess;

  if (config.type === "command") {
    const shell = config.shell ?? shellFor();
    child = spawn(config.command, {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      shell
    });
  } else {
    child = spawn(config.executable, config.args ?? [], {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  if (!child.pid) {
    throw new RunnerError(ExitCode.APP_LAUNCH_FAILED, "Failed to obtain process PID");
  }

  child.stdout?.on("data", (chunk) => {
    logger.debug(`[app:stdout] ${String(chunk).trimEnd()}`);
  });
  child.stderr?.on("data", (chunk) => {
    logger.debug(`[app:stderr] ${String(chunk).trimEnd()}`);
  });
  child.on("error", (error) => {
    logger.error("App process error", { error: String(error) });
  });
  child.on("exit", (code, signal) => {
    logger.info("App process exited", { code, signal });
  });

  const stop = async (): Promise<void> => {
    try {
      await killProcessTree(child.pid ?? 0);
    } catch (error) {
      throw new RunnerError(ExitCode.CLEANUP_FAILED, `Process cleanup failed: ${String(error)}`);
    }
  };

  return { child, stop };
}
