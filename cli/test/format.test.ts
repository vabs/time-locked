import assert from "node:assert/strict";
import test from "node:test";
import { formatDecisionList } from "../src/lib/format.js";

test("formats decision list as a stable table", () => {
  const output = formatDecisionList([
    {
      id: "abc123456",
      status: "running",
      title: "Should I accept the new role?",
      timerDuration: 86400,
      timerStartedAt: new Date(Date.now() - 3600_000).toISOString(),
      timerPausedAt: null,
      timeElapsedBeforePause: 0,
      description: null,
      outcome: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  assert.match(output, /ID\s+Status\s+Unlocks\s+Title/);
  assert.match(output, /abc12345\s+running/);
  assert.match(output, /Should I accept the new role\?/);
});
