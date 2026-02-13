import test from "node:test";
import assert from "node:assert/strict";
import { resolveTemplate, sanitizeName } from "../../src/utils/naming.js";

test("resolveTemplate replaces index and name", () => {
  const fileName = resolveTemplate("{index:02}-{name}.png", 3, "Play Initial");
  assert.equal(fileName, "03-play-initial.png");
});

test("sanitizeName keeps safe chars", () => {
  assert.equal(sanitizeName("REC@Initial"), "rec-initial");
});
