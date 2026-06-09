import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "@/lib/api";
import type { Decision, Note, Tag } from "@/lib/timer";
import TimerDisplay from "@/components/TimerDisplay";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatDistanceToNow } from "date-fns";
import { Pause, Play, Square, Send } from "lucide-react";

interface DecisionWithDetails extends Decision {
  notes: Note[];
  tags: Tag[];
}

export default function DecisionDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<DecisionWithDetails | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [outcome, setOutcome] = useState("");
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.get(`/decisions/${id}`);
      setDecision(data);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handlePause() {
    await api.patch(`/decisions/${id}/pause`);
    load();
  }

  async function handleResume() {
    await api.patch(`/decisions/${id}/resume`);
    load();
  }

  async function handleStop() {
    await api.patch(`/decisions/${id}/stop`);
    setShowStopConfirm(false);
    load();
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    await api.post(`/decisions/${id}/notes`, { content: noteContent.trim() });
    setNoteContent("");
    load();
  }

  async function handleOutcome(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome.trim()) return;
    await api.patch(`/decisions/${id}/outcome`, { outcome: outcome.trim() });
    load();
  }

  if (loading || !decision) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  const canControl = decision.status === "running" || decision.status === "paused";

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 block"
      >
        ← Back
      </button>

      <div className="border rounded-lg p-6 bg-card mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {decision.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold mb-2">{decision.title}</h1>
        {decision.description && (
          <p className="text-muted-foreground text-sm mb-4">{decision.description}</p>
        )}

        <div className="my-6">
          <TimerDisplay decision={decision} />
        </div>

        {canControl && (
          <div className="flex gap-2 justify-center">
            {decision.status === "running" ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            <button
              onClick={() => setShowStopConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-md text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          </div>
        )}
      </div>

      {/* Outcome — only for expired decisions */}
      {decision.status === "expired" && (
        <div className="border rounded-lg p-6 bg-card mb-6">
          <h2 className="font-semibold mb-3">What did you decide?</h2>
          {decision.outcome ? (
            <p className="text-sm">{decision.outcome}</p>
          ) : (
            <form onSubmit={handleOutcome} className="flex gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Record your outcome..."
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Save
              </button>
            </form>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="font-semibold mb-4">Notes & Thoughts</h2>

        {decision.status !== "stopped" && (
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a thought or consideration..."
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {decision.notes.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No notes yet. Add thoughts as they come to you.
            </p>
          )}
          {decision.notes.map((note) => (
            <div key={note.id} className="border rounded-md p-3 text-sm">
              <p>{note.content}</p>
              <span className="text-xs text-muted-foreground mt-1 block">
                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={showStopConfirm}
        title="Stop this decision?"
        description="The timer will be abandoned and this decision will be archived. You won't be able to restart it."
        confirmLabel="Stop decision"
        onConfirm={handleStop}
        onCancel={() => setShowStopConfirm(false)}
        danger
      />
    </div>
  );
}
