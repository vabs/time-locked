import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("program exposes the time-locked command name", () => {
  const program = createProgram();
  assert.equal(program.name(), "time-locked");
});
