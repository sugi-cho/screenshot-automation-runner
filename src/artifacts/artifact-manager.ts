import fs from "node:fs/promises";
import path from "node:path";
import { type RunnerConfig } from "../config/schema.js";
import { resolveTemplate } from "../utils/naming.js";
import { type AutomationAdapter } from "../adapter/types.js";

export type ArtifactManager = {
  runId: string;
  runDir: string;
  jsonlPath: string;
  nextScreenshotPath: (name: string) => Promise<{ filePath: string; fileName: string; index: number }>;
  saveFailureArtifacts: (stepId: string, adapter?: AutomationAdapter) => Promise<void>;
};

function createRunId(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
    2,
    "0"
  )}${String(now.getSeconds()).padStart(2, "0")}`;
  return `${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createArtifactManager(config: RunnerConfig): Promise<ArtifactManager> {
  const runId = createRunId();
  const outputDir = config.scenario.outputDir ?? config.output.dir;
  const runDir = path.join(outputDir, "..", "artifacts", runId);
  const failedDir = path.join(runDir, "failed");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(failedDir, { recursive: true });

  let screenshotIndex = 0;
  const jsonlPath = path.join(runDir, "run.jsonl");

  return {
    runId,
    runDir,
    jsonlPath,
    async nextScreenshotPath(name: string) {
      screenshotIndex += 1;
      const fileName = resolveTemplate(config.output.fileNameTemplate, screenshotIndex, name);
      const filePath = path.join(outputDir, fileName);
      return { filePath, fileName, index: screenshotIndex };
    },
    async saveFailureArtifacts(stepId: string, adapter?: AutomationAdapter) {
      if (!adapter) return;
      const screenshotPath = path.join(failedDir, `${stepId}.png`);
      try {
        await adapter.screenshot(screenshotPath, { fullPage: true });
      } catch {
        // ignore
      }

      if (adapter.content) {
        try {
          const html = await adapter.content();
          await fs.writeFile(path.join(failedDir, `${stepId}.html`), html, "utf8");
        } catch {
          // ignore
        }
      }
    }
  };
}
