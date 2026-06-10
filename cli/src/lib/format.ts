import { formatDuration } from "./durations.js";

export type DecisionStatus = "running" | "paused" | "expired" | "stopped";

export interface CliDecision {
  id: string;
  title: string;
  description: string | null;
  timerDuration: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  timeElapsedBeforePause: number;
  status: DecisionStatus;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getTimeRemaining(decision: CliDecision, now = Date.now()): number {
  if (decision.status === "expired" || decision.status === "stopped") return 0;
  if (decision.status === "paused") {
    return Math.max(0, decision.timerDuration - decision.timeElapsedBeforePause);
  }
  if (!decision.timerStartedAt) return decision.timerDuration;
  const elapsed =
    (now - new Date(decision.timerStartedAt).getTime()) / 1000 +
    decision.timeElapsedBeforePause;
  return Math.max(0, decision.timerDuration - elapsed);
}

export function formatDecisionList(decisions: CliDecision[]): string {
  const rows = decisions.map((decision) => ({
    id: decision.id.slice(0, 8),
    status: decision.status,
    unlocks: formatDuration(Math.floor(getTimeRemaining(decision))),
    title: decision.title,
  }));

  const widths = {
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    status: Math.max(6, ...rows.map((row) => row.status.length)),
    unlocks: Math.max(7, ...rows.map((row) => row.unlocks.length)),
  };

  const header = `${"ID".padEnd(widths.id)}  ${"Status".padEnd(widths.status)}  ${"Unlocks".padEnd(widths.unlocks)}  Title`;
  const body = rows.map(
    (row) =>
      `${row.id.padEnd(widths.id)}  ${row.status.padEnd(widths.status)}  ${row.unlocks.padEnd(widths.unlocks)}  ${row.title}`
  );

  return [header, ...body].join("\n");
}

export function printData(data: unknown, json: boolean, formatter: () => string): string {
  return json ? `${JSON.stringify(data, null, 2)}\n` : `${formatter()}\n`;
}
