const MINIMUM_SECONDS = 3600;

export function parseDuration(input: string): number {
  const match = input.trim().match(/^(\d+)([mhdw])$/);
  if (!match) {
    throw new Error("Use a duration like 1h, 24h, 3d, or 1w");
  }

  const value = Number(match[1]);
  const unit = match[2];
  const seconds =
    unit === "m"
      ? value * 60
      : unit === "h"
        ? value * 3600
        : unit === "d"
          ? value * 86400
          : value * 604800;

  if (seconds < MINIMUM_SECONDS) {
    throw new Error("Minimum timer duration is 1 hour");
  }

  return seconds;
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
