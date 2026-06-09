import { Link } from "react-router-dom";
import { formatDuration, getTimeRemaining, type Decision, type Tag } from "@/lib/timer";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  decision: Decision;
  tags?: Tag[];
}

export default function DecisionCard({ decision, tags = [] }: Props) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(decision));

  useEffect(() => {
    if (decision.status !== "running") return;
    const interval = setInterval(() => setRemaining(getTimeRemaining(decision)), 1000);
    return () => clearInterval(interval);
  }, [decision]);

  const pct = Math.max(0, Math.min(100, (remaining / decision.timerDuration) * 100));

  return (
    <Link
      to={`/decisions/${decision.id}`}
      className="block border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-sm line-clamp-2">{decision.title}</h3>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full shrink-0 capitalize",
            decision.status === "running" && "bg-primary/10 text-primary",
            decision.status === "paused" && "bg-yellow-100 text-yellow-800",
            decision.status === "expired" && "bg-green-100 text-green-800",
            decision.status === "stopped" && "bg-muted text-muted-foreground"
          )}
        >
          {decision.status}
        </span>
      </div>

      {decision.status !== "expired" && decision.status !== "stopped" && (
        <>
          <div className="text-2xl font-mono font-bold tabular-nums mb-2">
            {formatDuration(remaining)}
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
