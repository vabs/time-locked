import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("logout clears config and prints confirmation", async () => {
  let cleared = false;
  const output: string[] = [];
  const program = createProgram({
    clearConfig: async () => {
      cleared = true;
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "logout"]);
  assert.equal(cleared, true);
  assert.equal(output.join(""), "Logged out.\n");
});

test("whoami prints current user id", async () => {
  const output: string[] = [];
  const program = createProgram({
    apiClient: {
      get: async () => ({ userId: "user_123", sessionId: "sess_123" }),
      post: async () => ({}),
      patch: async () => ({}),
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "whoami"]);
  assert.match(output.join(""), /user_123/);
});
