import { spawnSync } from "node:child_process";
import path from "node:path";

const e2eFile = path.resolve("dist/test/e2e/minimal.e2e.test.js");
const result = spawnSync(process.execPath, ["--experimental-test-isolation=none", "--test", e2eFile], {
  stdio: "inherit"
});
process.exit(result.status ?? 1);
