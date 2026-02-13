import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function collectTestFiles(dirPath) {
  const files = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(fullPath)));
      continue;
    }
    if (entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const roots = [path.resolve("dist/test/unit"), path.resolve("dist/test/integration")];
  const files = [];
  for (const root of roots) {
    try {
      files.push(...(await collectTestFiles(root)));
    } catch {
      // ignore non-existing roots
    }
  }

  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.error("No test files found.");
    process.exit(1);
  }

  const result = spawnSync(process.execPath, ["--experimental-test-isolation=none", "--test", ...files], {
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
