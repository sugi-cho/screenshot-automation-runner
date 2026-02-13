import fs from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerOptions = {
  runId: string;
  verbose?: boolean;
  jsonlPath?: string;
};

type LogMeta = Record<string, unknown> | undefined;

export class Logger {
  private readonly runId: string;
  private readonly verbose: boolean;
  private readonly jsonlPath?: string;

  constructor(options: LoggerOptions) {
    this.runId = options.runId;
    this.verbose = options.verbose ?? false;
    this.jsonlPath = options.jsonlPath;
    if (this.jsonlPath) {
      fs.mkdirSync(path.dirname(this.jsonlPath), { recursive: true });
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (!this.verbose) return;
    this.write("debug", message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: LogMeta): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: LogMeta): void {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      runId: this.runId,
      message,
      ...(meta ?? {})
    };

    const line = `[${event.timestamp}] [${level.toUpperCase()}] ${message}`;
    if (level === "error") {
      // eslint-disable-next-line no-console
      console.error(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }

    if (this.jsonlPath) {
      fs.appendFileSync(this.jsonlPath, `${JSON.stringify(event)}\n`, "utf8");
    }
  }
}
