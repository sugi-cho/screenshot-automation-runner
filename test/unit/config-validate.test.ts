import test from "node:test";
import assert from "node:assert/strict";
import { validateRunnerConfig } from "../../src/config/validate.js";

test("validateRunnerConfig passes valid config", () => {
  const config = {
    version: 1,
    project: "app",
    launch: { type: "command", command: "npm run dev" },
    automation: {
      adapter: "playwright-cdp",
      cdpPort: 9222,
      connectTimeoutMs: 3000,
      viewport: { width: 1280, height: 1280 }
    },
    output: { dir: "docs/screenshots", fileNameTemplate: "{index:02}-{name}.png", overwrite: true },
    scenario: {
      name: "main",
      steps: [{ id: "s1", type: "screenshot", name: "initial" }]
    }
  };

  const result = validateRunnerConfig(config);
  assert.equal(result.ok, true);
});

test("validateRunnerConfig reports missing fields", () => {
  const config = {
    version: 2
  };
  const result = validateRunnerConfig(config);
  assert.equal(result.ok, false);
  assert.ok(result.issues.length > 0);
});
