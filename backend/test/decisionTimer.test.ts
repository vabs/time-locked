import assert from "node:assert/strict";
import test from "node:test";
import { elapsedSeconds, hasTimerElapsed } from "../src/services/decisionTimer.js";
import type { Decision } from "../src/db/schema.js";

const base: Decision = {
  id: "d1",
  userId: "u1",
  title: "Pick a vendor",
  description: null,
  timerDuration: 3600,
  timerStartedAt: new Date("2026-06-23T12:00:00Z"),
  timerPausedAt: null,
  timeElapsedBeforePause: 0,
  status: "running",
  outcome: null,
  createdAt: new Date("2026-06-23T12:00:00Z"),
  updatedAt: new Date("2026-06-23T12:00:00Z"),
};

const at = (iso: string) => new Date(iso);

test("running timer before its duration has not elapsed", () => {
  assert.equal(hasTimerElapsed(base, at("2026-06-23T12:59:59Z")), false);
});

test("running timer at exactly its duration has elapsed", () => {
  assert.equal(hasTimerElapsed(base, at("2026-06-23T13:00:00Z")), true);
});

test("running timer past its duration has elapsed", () => {
  assert.equal(hasTimerElapsed(base, at("2026-06-23T14:00:00Z")), true);
});

test("banked time before a pause counts toward elapsed", () => {
  // 3000s banked + 600s since resume = 3600s = duration.
  const resumed = { ...base, timeElapsedBeforePause: 3000 };
  assert.equal(hasTimerElapsed(resumed, at("2026-06-23T12:10:00Z")), true);
  assert.equal(hasTimerElapsed(resumed, at("2026-06-23T12:09:59Z")), false);
});

test("paused, expired, and stopped timers never auto-elapse", () => {
  const future = at("2027-01-01T00:00:00Z");
  for (const status of ["paused", "expired", "stopped"] as const) {
    assert.equal(hasTimerElapsed({ ...base, status }, future), false, status);
  }
});

test("a running timer with no start time has not elapsed", () => {
  assert.equal(
    hasTimerElapsed({ ...base, timerStartedAt: null }, at("2027-01-01T00:00:00Z")),
    false
  );
});

test("elapsedSeconds sums time since start and banked time", () => {
  const resumed = { ...base, timeElapsedBeforePause: 100 };
  assert.equal(elapsedSeconds(resumed, at("2026-06-23T12:05:00Z")), 400);
});
