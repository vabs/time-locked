import { useEffect, useState } from "react";
import { getTimeRemaining, formatDuration, type Decision } from "@/lib/timer";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

const SIZE = 208;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function TimerDisplay({ decision }: { decision: Decision }) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(decision));

  useEffect(() => {
    if (decision.status !== "running") {
      setRemaining(getTimeRemaining(decision));
      return;
    }
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(decision));
    }, 1000);
    return () => clearInterval(interval);
  }, [decision]);

  const status = decision.status;
  const meta = STATUS_META[status];
  const isActive = status === "running" || status === "paused";
  const pct = isActive ? Math.max(0, Math.min(1, remaining / decision.timerDuration)) : 1;
  const isLow = status === "running" && pct < 0.1;

  // Keep the countdown on one line inside the ring: longer strings get a
  // smaller face (e.g. "2d 23h 35m 39s" vs "39s").
  const timeText = formatDuration(remaining);
  const timeSize =
    timeText.length > 11 ? "text-xl" : timeText.length > 7 ? "text-2xl" : "text-3xl";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-secondary"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-linear",
              isLow ? "stroke-destructive" : meta.ring
            )}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4">
          {isActive ? (
            <>
              <span
                className={cn(
                  "whitespace-nowrap font-mono font-semibold tabular-nums",
                  timeSize,
                  isLow && "text-destructive"
                )}
              >
                {timeText}
              </span>
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-widest",
                  meta.text
                )}
              >
                {meta.label}
              </span>
            </>
          ) : (
            <span
              className={cn(
                "font-display text-2xl font-semibold",
                meta.text,
                status === "stopped" && "line-through"
              )}
            >
              {meta.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
