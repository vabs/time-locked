import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import { getTimeRemaining, type Decision, type Tag } from "@/lib/timer";
import DecisionCard from "@/components/DecisionCard";
import { Skeleton } from "@/components/Skeleton";

type SortOption = "newest" | "timeRemaining";

export default function Dashboard() {
  const api = useApi();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTagId = searchParams.get("tag") ?? "all";
  const sortOption: SortOption =
    searchParams.get("sort") === "timeRemaining" ? "timeRemaining" : "newest";

  useEffect(() => {
    Promise.all([
      api.get("/decisions?status=running"),
      api.get("/decisions?status=paused"),
    ])
      .then(([running, paused]) => {
        setDecisions([...running, ...paused]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Re-sort while sorting by time remaining so order tracks the live countdown.
  useEffect(() => {
    if (sortOption !== "timeRemaining") return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [sortOption]);

  // Tag options come from the decisions actually loaded, so a filter never
  // points at a tag with no matching cards.
  const availableTags = useMemo(() => {
    const byId = new Map<string, Tag>();
    for (const decision of decisions) {
      for (const tag of decision.tags ?? []) byId.set(tag.id, tag);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [decisions]);

  const visibleDecisions = useMemo(() => {
    const filtered =
      selectedTagId === "all"
        ? decisions
        : decisions.filter((decision) =>
            (decision.tags ?? []).some((tag) => tag.id === selectedTagId)
          );

    if (sortOption !== "timeRemaining") return filtered;

    return [...filtered].sort((a, b) => getTimeRemaining(a) - getTimeRemaining(b));
  }, [decisions, selectedTagId, sortOption]);

  function updateSearchParam(key: "tag" | "sort", value: string) {
    const next = new URLSearchParams(searchParams);

    if ((key === "tag" && value === "all") || (key === "sort" && value === "newest")) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next);
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Active Decisions</h1>
        <Link
          to="/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Decision
        </Link>
      </div>

      {decisions.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tag
            <select
              value={selectedTagId}
              onChange={(event) => updateSearchParam("tag", event.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background min-w-40 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Sort
            <select
              value={sortOption}
              onChange={(event) => updateSearchParam("sort", event.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background min-w-44 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest first</option>
              <option value="timeRemaining">Time remaining</option>
            </select>
          </label>
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No active decisions</p>
          <p className="text-sm mb-6">Start by locking in a decision you need to think through.</p>
          <Link
            to="/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Create your first decision
          </Link>
        </div>
      ) : visibleDecisions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No decisions match this filter</p>
          <p className="text-sm">Try a different tag or show all tags.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleDecisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  );
}
