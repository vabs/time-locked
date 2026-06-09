import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import type { Decision } from "@/lib/timer";
import DecisionCard from "@/components/DecisionCard";

export default function Dashboard() {
  const api = useApi();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/decisions?status=running")
      .then((data) => {
        const paused: Decision[] = [];
        api.get("/decisions?status=paused").then((p) => {
          setDecisions([...data, ...p]);
          setLoading(false);
        });
        void paused;
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Active Decisions</h1>
        <Link
          to="/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Decision
        </Link>
      </div>

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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  );
}
