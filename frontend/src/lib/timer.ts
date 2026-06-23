export type TimerStatus = "running" | "paused" | "expired" | "stopped";

export interface Decision {
  id: string;
  title: string;
  description: string | null;
  timerDuration: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  timeElapsedBeforePause: number;
  status: TimerStatus;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
  noteCount?: number;
}

export interface Note {
  id: string;
  decisionId: string;
  content: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  userId: string | null;
  name: string;
  color: string;
  isSystem: boolean;
}

export function getTimeRemaining(decision: Decision): number {
  if (decision.status === "expired" || decision.status === "stopped") return 0;
  if (decision.status === "paused") {
    return Math.max(0, decision.timerDuration - decision.timeElapsedBeforePause);
  }
  if (!decision.timerStartedAt) return decision.timerDuration;
  const elapsed =
    (Date.now() - new Date(decision.timerStartedAt).getTime()) / 1000 +
    decision.timeElapsedBeforePause;
  return Math.max(0, decision.timerDuration - elapsed);
}

// A running timer that has counted down to zero is effectively expired, even
// before the backend's 30s scheduler poll persists the change. Derive that
// here so the UI can surface the expired state (and outcome form) immediately.
export function getEffectiveStatus(decision: Decision): TimerStatus {
  if (decision.status === "running" && getTimeRemaining(decision) <= 0) {
    return "expired";
  }
  return decision.status;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  if (d > 0 || h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export const TIMER_PRESETS = [
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hours", value: 86400 },
  { label: "3 days", value: 259200 },
  { label: "1 week", value: 604800 },
] as const;
