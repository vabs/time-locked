import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration, parseDuration } from "../src/lib/durations.js";

test("parses supported duration units into seconds", () => {
  assert.equal(parseDuration("1h"), 3600);
  assert.equal(parseDuration("24h"), 86400);
  assert.equal(parseDuration("3d"), 259200);
  assert.equal(parseDuration("1w"), 604800);
});

test("rejects durations shorter than one hour", () => {
  assert.throws(() => parseDuration("30m"), /Minimum timer duration is 1 hour/);
});

test("rejects unsupported duration input", () => {
  assert.throws(() => parseDuration("soon"), /Use a duration like 1h, 24h, 3d, or 1w/);
});

test("formats duration values for terminal output", () => {
  assert.equal(formatDuration(3600), "1h");
  assert.equal(formatDuration(3660), "1h 1m");
  assert.equal(formatDuration(90061), "1d 1h");
});
