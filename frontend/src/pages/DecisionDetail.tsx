import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "@/lib/api";
import { getEffectiveStatus, type Decision, type Note, type Tag } from "@/lib/timer";
import TimerDisplay from "@/components/TimerDisplay";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { formatDistanceToNow } from "date-fns";
import { Pause, Play, Square, Send, Trash2, ArrowLeft } from "lucide-react";

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
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

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

  // Tick every second while running so the page re-derives effective status and
  // surfaces the outcome form the moment the countdown reaches zero — without
  // waiting for the 30s server poll or a manual reload.
  useEffect(() => {
    if (!decision || decision.status !== "running") return;
    const interval = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [decision]);

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

  async function handleDeleteNote() {
    if (!noteToDelete) return;
    await api.del(`/decisions/${id}/notes/${noteToDelete}`);
    setNoteToDelete(null);
    load();
  }

  async function handleOutcome(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome.trim()) return;
    await api.patch(`/decisions/${id}/outcome`, { outcome: outcome.trim() });
    load();
  }

  if (loading || !decision) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  const status = getEffectiveStatus(decision);
  // Drive TimerDisplay with the effective status so the ring/label match the
  // form (TimerDisplay keys its countdown effect on primitive timer fields, so
  // this fresh wrapper object each tick won't reset its interval).
  const view = { ...decision, status };
  const canControl = status === "running" || status === "paused";
  // Both expired (timer ran out) and stopped (decided early) are terminal
  // states where a decision was reached, so both can record an outcome.
  const canRecordOutcome = status === "expired" || status === "stopped";

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="border rounded-lg p-6 bg-card mb-6">
        {decision.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {decision.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="font-display text-2xl font-semibold leading-snug mb-2">{decision.title}</h1>
        {decision.description && (
          <p className="text-muted-foreground text-sm mb-4">{decision.description}</p>
        )}

        <div className="my-8">
          <TimerDisplay decision={view} />
        </div>

        {canControl && (
          <div className="flex gap-2 justify-center">
            {status === "running" ? (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="w-4 h-4" /> Pause
              </Button>
            ) : (
              <Button variant="outline" onClick={handleResume}>
                <Play className="w-4 h-4" /> Resume
              </Button>
            )}
            <Button variant="destructive" onClick={() => setShowStopConfirm(true)}>
              <Square className="w-4 h-4" /> Stop
            </Button>
          </div>
        )}
      </div>

      {/* Outcome — for terminal decisions (expired or stopped) */}
      {canRecordOutcome && (
        <div className="border rounded-lg p-6 bg-card mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">What did you decide?</h2>
          {decision.outcome ? (
            <p className="text-sm leading-6">{decision.outcome}</p>
          ) : (
            <form onSubmit={handleOutcome} className="flex gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Record your outcome..."
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit">Save</Button>
            </form>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="font-display text-lg font-semibold mb-4">Notes &amp; Thoughts</h2>

        {decision.status !== "stopped" && (
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              type="text"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a thought or consideration..."
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="icon" aria-label="Add note">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {decision.notes.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No notes yet. Add thoughts as they come to you.
            </p>
          )}
          {decision.notes.map((note) => (
            <div key={note.id} className="border rounded-md p-3 text-sm bg-background/40">
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1">{note.content}</p>
                {decision.status !== "stopped" && (
                  <button
                    onClick={() => setNoteToDelete(note.id)}
                    aria-label="Delete note"
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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

      <ConfirmDialog
        open={noteToDelete !== null}
        title="Delete this note?"
        description="This note will be permanently removed. This cannot be undone."
        confirmLabel="Delete note"
        onConfirm={handleDeleteNote}
        onCancel={() => setNoteToDelete(null)}
        danger
      />
    </div>
  );
}
