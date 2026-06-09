import { db } from "./index.js";
import { tags } from "./schema.js";

const SYSTEM_TAGS = [
  { id: "tag_financial", name: "Financial", color: "#10b981", isSystem: true },
  { id: "tag_career", name: "Career", color: "#6366f1", isSystem: true },
  { id: "tag_health", name: "Health", color: "#ef4444", isSystem: true },
  { id: "tag_relationship", name: "Relationship", color: "#f59e0b", isSystem: true },
  { id: "tag_personal", name: "Personal", color: "#8b5cf6", isSystem: true },
  { id: "tag_work", name: "Work", color: "#3b82f6", isSystem: true },
];

for (const tag of SYSTEM_TAGS) {
  db.insert(tags)
    .values({ ...tag, userId: null })
    .onConflictDoNothing()
    .run();
}

console.log("System tags seeded.");
