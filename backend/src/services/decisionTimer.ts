import type { Decision } from "../db/schema.js";

// Seconds a timer has accumulated: time since it (re)started plus any time
// banked before a pause.
export function elapsedSeconds(decision: Decision, now: Date): number {
  const sinceStart = decision.timerStartedAt
    ? (now.getTime() - decision.timerStartedAt.getTime()) / 1000
    : 0;
  return sinceStart + decision.timeElapsedBeforePause;
}

// True only for a running timer that has reached or passed its duration. Paused,
// expired and stopped decisions never report as elapsed — they don't auto-expire.
export function hasTimerElapsed(decision: Decision, now: Date): boolean {
  if (decision.status !== "running" || !decision.timerStartedAt) return false;
  return elapsedSeconds(decision, now) >= decision.timerDuration;
}
