import type { TimerStatus } from "@/lib/timer";

interface StatusMeta {
  label: string;
  text: string;
  badge: string;
  dot: string;
  ring: string;
}

// Single source of truth for how each lifecycle status reads visually.
export const STATUS_META: Record<TimerStatus, StatusMeta> = {
  running: {
    label: "Running",
    text: "text-status-running",
    badge: "bg-status-running/15 text-status-running",
    dot: "bg-status-running",
    ring: "stroke-status-running",
  },
  paused: {
    label: "Paused",
    text: "text-status-paused",
    badge: "bg-status-paused/15 text-status-paused",
    dot: "bg-status-paused",
    ring: "stroke-status-paused",
  },
  expired: {
    label: "Expired",
    text: "text-status-expired",
    badge: "bg-status-expired/15 text-status-expired",
    dot: "bg-status-expired",
    ring: "stroke-status-expired",
  },
  stopped: {
    label: "Stopped",
    text: "text-status-stopped",
    badge: "bg-status-stopped/15 text-status-stopped",
    dot: "bg-status-stopped",
    ring: "stroke-status-stopped",
  },
};
