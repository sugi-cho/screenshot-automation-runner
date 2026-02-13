import { setTimeout as delay } from "node:timers/promises";

export type RetryOptions = {
  attempts: number;
  intervalMs: number;
  backoff?: "fixed" | "exponential";
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === options.attempts) break;
      const multiplier = options.backoff === "exponential" ? 2 ** (attempt - 1) : 1;
      await delay(options.intervalMs * multiplier);
    }
  }

  throw lastError;
}
