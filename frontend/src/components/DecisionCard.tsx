import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  TIMER_PRESETS,
  formatDuration,
  getTimeRemaining,
  type Decision,
} from "@/lib/timer";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

interface Props {
  decision: Decision;
}

export default function DecisionCard({ decision }: Props) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(decision));

  useEffect(() => {
    if (decision.status !== "running") return;
    const interval = setInterval(() => setRemaining(getTimeRemaining(decision)), 1000);
    return () => clearInterval(interval);
  }, [decision]);

  const pct = Math.max(0, Math.min(100, (remaining / decision.timerDuration) * 100));
  const noteCount = decision.noteCount ?? 0;
  const tags = decision.tags ?? [];
  const isActive = decision.status === "running" || decision.status === "paused";
  const meta = STATUS_META[decision.status];

  const durationLabel =
    TIMER_PRESETS.find((preset) => preset.value === decision.timerDuration)?.label ??
    formatDuration(decision.timerDuration);

  return (
    <Link
      to={`/decisions/${decision.id}`}
      className="block rounded-lg border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="border-b pb-4">
        <p className="font-display text-lg font-semibold leading-snug line-clamp-2">
          {decision.title}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
          {tags.length > 0 && (
            <>
              {tags.map((tag, i) => (
                <span key={tag.id}>
                  <span className="font-medium" style={{ color: tag.color }}>
                    {tag.name}
                  </span>
                  {i < tags.length - 1 ? ", " : null}
                </span>
              ))}
              {" · locked for "}
              {durationLabel}
            </>
          )}
          {tags.length === 0 && `Locked for ${durationLabel}`}
        </p>
      </div>

      {isActive && (
        <div className="py-6">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Time remaining
            </span>
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {formatDuration(remaining)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", meta.dot)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className={cn("grid grid-cols-2 gap-3", !isActive && "pt-5")}>
        <div className="rounded-md border bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className={cn("mt-1 text-sm font-semibold", meta.text)}>{meta.label}</p>
        </div>
        <div className="rounded-md border bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="mt-1 text-sm font-semibold">
            {noteCount === 0 ? "None yet" : `${noteCount} captured`}
          </p>
        </div>
      </div>
    </Link>
  );
}
