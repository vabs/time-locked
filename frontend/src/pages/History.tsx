import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import type { Decision } from "@/lib/timer";
import DecisionCard from "@/components/DecisionCard";

type Filter = "all" | "expired" | "stopped";

export default function History() {
  const api = useApi();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/decisions?status=expired"), api.get("/decisions?status=stopped")])
      .then(([expired, stopped]) => setDecisions([...expired, ...stopped]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? decisions : decisions.filter((d) => d.status === filter);

  if (loading) return <div className="text-muted-foreground text-sm">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">History</h1>

      <div className="flex gap-2 mb-6">
        {(["all", "expired", "stopped"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-16">No decisions here yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  );
}
