import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/lib/api";
import { TIMER_PRESETS, type Tag } from "@/lib/timer";
import { cn } from "@/lib/utils";

export default function NewDecision() {
  const api = useApi();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(TIMER_PRESETS[0].value);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/tags").then(setTags).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    try {
      const decision = await api.post("/decisions", {
        title: title.trim(),
        description: description.trim() || null,
        timerDuration: duration,
        tagIds: selectedTagIds,
      });
      navigate(`/decisions/${decision.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create decision");
      setSubmitting(false);
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Decision</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-1">Decision title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What decision are you facing?"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Context (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any initial thoughts or context..."
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Lock duration</label>
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setDuration(preset.value)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                  duration === preset.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    selectedTagIds.includes(tag.id)
                      ? "text-white border-transparent"
                      : "bg-background border-border text-foreground"
                  )}
                  style={
                    selectedTagIds.includes(tag.id)
                      ? { backgroundColor: tag.color }
                      : {}
                  }
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Starting timer..." : "Lock in decision"}
        </button>
      </form>
    </div>
  );
}
