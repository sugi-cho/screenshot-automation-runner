import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { main } from "../../src/cli/index.js";
import { ExitCode } from "../../src/logging/error-codes.js";

const configPath = path.resolve("test", "fixtures", "minimal.config.json");
const cdpFailConfigPath = path.resolve("test", "fixtures", "cdp-fail.config.json");

test("cli validate succeeds", () => {
  return main(["validate", "-c", configPath]).then((code) => {
    assert.equal(code, 0);
  });
});

test("cli run dry-run succeeds", () => {
  return main(["run", "-c", configPath, "--dry-run"]).then((code) => {
    assert.equal(code, 0);
  });
});

test("cli run returns 21 when cdp connect fails", () => {
  return main(["run", "-c", cdpFailConfigPath]).then((code) => {
    assert.equal(code, ExitCode.CDP_CONNECT_FAILED);
  });
});
