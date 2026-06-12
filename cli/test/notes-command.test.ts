import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("notes add posts note content", async () => {
  let path = "";
  let body: unknown;
  const program = createProgram({
    apiClient: {
      get: async () => ({}),
      post: async (nextPath: string, nextBody: unknown) => {
        path = nextPath;
        body = nextBody;
        return { id: "note_1" };
      },
      patch: async () => ({}),
    },
    writeOutput: () => {},
  });

  await program.parseAsync([
    "node",
    "time-locked",
    "notes",
    "add",
    "decision_1",
    "--text",
    "New concern surfaced",
  ]);

  assert.equal(path, "/api/decisions/decision_1/notes");
  assert.deepEqual(body, { content: "New concern surfaced" });
});
