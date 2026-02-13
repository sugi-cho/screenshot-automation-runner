import test from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../../src/utils/retry.js";
import { withTimeout } from "../../src/utils/timeout.js";

test("withRetry retries until success", async () => {
  let count = 0;
  const result = await withRetry(
    async () => {
      count += 1;
      if (count < 3) {
        throw new Error("fail");
      }
      return "ok";
    },
    { attempts: 3, intervalMs: 1 }
  );
  assert.equal(result, "ok");
  assert.equal(count, 3);
});

test("withTimeout throws after timeout", async () => {
  await assert.rejects(
    withTimeout(new Promise((resolve) => setTimeout(resolve, 50)), 10, "timeout"),
    /timeout/
  );
});
