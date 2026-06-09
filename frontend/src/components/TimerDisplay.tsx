import { useEffect, useState } from "react";
import { getTimeRemaining, formatDuration, type Decision } from "@/lib/timer";
import { cn } from "@/lib/utils";

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

  const pct = Math.max(0, Math.min(100, (remaining / decision.timerDuration) * 100));
  const isLow = pct < 10;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "text-4xl font-mono font-bold tabular-nums",
          decision.status === "expired" && "text-muted-foreground",
          decision.status === "stopped" && "text-muted-foreground line-through",
          isLow && decision.status === "running" && "text-destructive"
        )}
      >
        {decision.status === "expired" ? "Expired" : formatDuration(remaining)}
      </div>

      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            isLow ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="text-xs text-muted-foreground capitalize">{decision.status}</span>
    </div>
  );
}
