import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { runScenario } from "../../src/engine/step-engine.js";
import { createArtifactManager } from "../../src/artifacts/artifact-manager.js";
import { Logger } from "../../src/logging/logger.js";
import { type AutomationAdapter } from "../../src/adapter/types.js";
import { type RunnerConfig } from "../../src/config/schema.js";

class MockAdapter implements AutomationAdapter {
  actions: string[] = [];

  async waitFor(): Promise<void> {
    this.actions.push("wait");
  }
  async click(selector: string): Promise<void> {
    this.actions.push(`click:${selector}`);
  }
  async input(selector: string, value: string): Promise<void> {
    this.actions.push(`input:${selector}:${value}`);
  }
  async key(keys: string[]): Promise<void> {
    this.actions.push(`key:${keys.join("+")}`);
  }
  async screenshot(filePath: string): Promise<void> {
    this.actions.push(`screenshot:${filePath}`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "png", "utf8");
  }
}

test("step engine executes steps and saves screenshot", async () => {
  const baseDir = path.resolve("test-output", "integration");
  await fs.rm(baseDir, { recursive: true, force: true });

  const config: RunnerConfig = {
    version: 1,
    project: "integration",
    launch: { type: "command", command: "echo noop" },
    automation: {
      adapter: "playwright-cdp",
      cdpPort: 9222,
      connectTimeoutMs: 5000,
      viewport: { width: 100, height: 100 }
    },
    output: {
      dir: path.join(baseDir, "screenshots"),
      fileNameTemplate: "{index:02}-{name}.png",
      overwrite: true
    },
    scenario: {
      name: "s1",
      steps: [
        { id: "a", type: "wait", until: { kind: "timeout", ms: 1 } },
        { id: "b", type: "click", selector: "#play" },
        { id: "c", type: "screenshot", name: "main" }
      ]
    }
  };

  const artifacts = await createArtifactManager(config);
  const logger = new Logger({ runId: artifacts.runId, jsonlPath: artifacts.jsonlPath, verbose: true });
  const adapter = new MockAdapter();

  const result = await runScenario({
    config,
    scenario: config.scenario,
    logger,
    artifacts,
    adapter
  });

  assert.equal(result.success, true);
  assert.equal(result.steps.length, 3);
  const screenshotStep = result.steps.find((s) => s.id === "c");
  assert.ok(screenshotStep?.screenshot);
  await fs.access(screenshotStep?.screenshot ?? "");
});
