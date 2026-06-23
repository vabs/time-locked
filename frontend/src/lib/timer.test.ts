import { describe, expect, it } from "vitest";
import { getEffectiveStatus, getTimeRemaining, type Decision } from "./timer";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Pick a vendor",
    description: null,
    timerDuration: 3600,
    timerStartedAt: new Date(Date.now() - 60_000).toISOString(),
    timerPausedAt: null,
    timeElapsedBeforePause: 0,
    status: "running",
    outcome: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("getEffectiveStatus", () => {
  it("keeps a running timer that still has time as running", () => {
    expect(getEffectiveStatus(makeDecision())).toBe("running");
  });

  it("treats a running timer that has counted to zero as expired", () => {
    const d = makeDecision({
      timerStartedAt: new Date(Date.now() - 7200_000).toISOString(),
    });
    expect(getTimeRemaining(d)).toBe(0);
    expect(getEffectiveStatus(d)).toBe("expired");
  });

  it("does not auto-expire a paused timer even at zero remaining", () => {
    const d = makeDecision({ status: "paused", timeElapsedBeforePause: 3600 });
    expect(getTimeRemaining(d)).toBe(0);
    expect(getEffectiveStatus(d)).toBe("paused");
  });

  it("passes through terminal statuses unchanged", () => {
    expect(getEffectiveStatus(makeDecision({ status: "expired" }))).toBe("expired");
    expect(getEffectiveStatus(makeDecision({ status: "stopped" }))).toBe("stopped");
  });

  it("keeps an unstarted running timer as running", () => {
    const d = makeDecision({ timerStartedAt: null });
    expect(getEffectiveStatus(d)).toBe("running");
  });
});
