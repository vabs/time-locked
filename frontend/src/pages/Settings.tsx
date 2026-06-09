import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { subscribeToPush } from "@/lib/push";
import type { Tag } from "@/lib/timer";
import { Trash2 } from "lucide-react";

export default function Settings() {
  const api = useApi();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    api.get("/tags").then(setTags).catch(() => {});
    setPushEnabled(Notification.permission === "granted");
  }, []);

  async function handleEnablePush() {
    setPushLoading(true);
    try {
      await subscribeToPush(api.get, api.post);
      setPushEnabled(Notification.permission === "granted");
    } finally {
      setPushLoading(false);
    }
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const tag = await api.post("/tags", { name: newTagName.trim(), color: newTagColor });
    setTags((prev) => [...prev, tag]);
    setNewTagName("");
  }

  async function handleDeleteTag(id: string) {
    await api.del(`/tags/${id}`);
    setTags((prev) => prev.filter((t) => t.id !== id));
  }

  const userTags = tags.filter((t) => !t.isSystem);
  const systemTags = tags.filter((t) => t.isSystem);

  return (
    <div className="max-w-lg flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Notifications */}
      <section className="border rounded-lg p-6 bg-card">
        <h2 className="font-semibold mb-1">Notifications</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Get notified when your decision timer expires.
        </p>
        {pushEnabled ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Push notifications enabled
          </div>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={pushLoading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {pushLoading ? "Enabling..." : "Enable push notifications"}
          </button>
        )}
      </section>

      {/* Custom tags */}
      <section className="border rounded-lg p-6 bg-card">
        <h2 className="font-semibold mb-4">Custom Tags</h2>

        <form onSubmit={handleAddTag} className="flex gap-2 mb-4">
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-10 h-10 rounded border cursor-pointer"
          />
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Add
          </button>
        </form>

        {userTags.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {userTags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">System tags</p>
          <div className="flex flex-wrap gap-2">
            {systemTags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
