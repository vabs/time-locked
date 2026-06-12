import assert from "node:assert/strict";
import test from "node:test";
import { createProgram } from "../src/index.js";

test("decisions list --active fetches running and paused decisions", async () => {
  const paths: string[] = [];
  const output: string[] = [];
  const program = createProgram({
    apiClient: {
      get: async (path: string) => {
        paths.push(path);
        return [];
      },
      post: async () => ({}),
      patch: async () => ({}),
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "decisions", "list", "--active"]);
  assert.deepEqual(paths, ["/api/decisions?status=running", "/api/decisions?status=paused"]);
});

test("decisions create with flags posts expected payload", async () => {
  let posted: unknown;
  const program = createProgram({
    apiClient: {
      get: async () => [{ id: "tag_career", name: "Career" }],
      post: async (_path: string, body: unknown) => {
        posted = body;
        return { id: "abc123", title: "Role?", status: "running", timerDuration: 86400 };
      },
      patch: async () => ({}),
    },
    writeOutput: () => {},
  });

  await program.parseAsync([
    "node",
    "time-locked",
    "decisions",
    "create",
    "--title",
    "Role?",
    "--duration",
    "24h",
    "--tag",
    "Career",
    "--yes",
  ]);

  assert.deepEqual(posted, {
    title: "Role?",
    description: null,
    timerDuration: 86400,
    tagIds: ["tag_career"],
  });
});

test("decisions create --yes does not prompt for optional tags", async () => {
  let posted: unknown;
  const program = createProgram({
    apiClient: {
      get: async () => [{ id: "tag_career", name: "Career" }],
      post: async (_path: string, body: unknown) => {
        posted = body;
        return { id: "abc123", title: "Role?", status: "running", timerDuration: 86400 };
      },
      patch: async () => ({}),
    },
    writeOutput: () => {},
  });

  await Promise.race([
    program.parseAsync([
      "node",
      "time-locked",
      "decisions",
      "create",
      "--title",
      "Role?",
      "--duration",
      "24h",
      "--yes",
    ]),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("command prompted for optional tags")), 250)
    ),
  ]);

  assert.deepEqual(posted, {
    title: "Role?",
    description: null,
    timerDuration: 86400,
    tagIds: [],
  });
});

test("decisions show fetches decision detail", async () => {
  const paths: string[] = [];
  const output: string[] = [];
  const program = createProgram({
    apiClient: {
      get: async (path: string) => {
        paths.push(path);
        return { id: "decision_1", title: "Role?", status: "running" };
      },
      post: async () => ({}),
      patch: async () => ({}),
    },
    writeOutput: (text) => output.push(text),
  });

  await program.parseAsync(["node", "time-locked", "decisions", "show", "decision_1"]);
  assert.deepEqual(paths, ["/api/decisions/decision_1"]);
  assert.match(output.join(""), /Role\?/);
});

test("decision state commands patch expected endpoints", async () => {
  const calls: Array<{ path: string; body?: unknown }> = [];
  const program = createProgram({
    apiClient: {
      get: async () => ({}),
      post: async () => ({}),
      patch: async (path: string, body?: unknown) => {
        calls.push({ path, body });
        return {};
      },
    },
    writeOutput: () => {},
  });

  await program.parseAsync(["node", "time-locked", "decisions", "pause", "decision_1"]);
  await program.parseAsync(["node", "time-locked", "decisions", "resume", "decision_1"]);
  await program.parseAsync(["node", "time-locked", "decisions", "stop", "decision_1", "--yes"]);
  await program.parseAsync([
    "node",
    "time-locked",
    "decisions",
    "outcome",
    "decision_1",
    "--text",
    "Wait",
  ]);

  assert.deepEqual(calls, [
    { path: "/api/decisions/decision_1/pause", body: undefined },
    { path: "/api/decisions/decision_1/resume", body: undefined },
    { path: "/api/decisions/decision_1/stop", body: undefined },
    { path: "/api/decisions/decision_1/outcome", body: { outcome: "Wait" } },
  ]);
});
