import { setTimeout as delay } from "node:timers/promises";

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  if (timeoutMs <= 0) {
    return promise;
  }

  const timeoutPromise = delay(timeoutMs).then(() => {
    throw new Error(message);
  });

  return Promise.race([promise, timeoutPromise]);
}
