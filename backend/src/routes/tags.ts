import { Router } from "express";
import { db } from "../db/index.js";
import { tags } from "../db/schema.js";
import { or, isNull, eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = getUserId(req);
  const rows = db
    .select()
    .from(tags)
    .where(or(isNull(tags.userId), eq(tags.userId, userId)))
    .all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { name, color } = req.body;

  if (!name) { res.status(400).json({ error: "name required" }); return; }

  const tag = {
    id: randomUUID(),
    userId,
    name,
    color: color ?? "#6366f1",
    isSystem: false,
  };

  db.insert(tags).values(tag).run();
  res.status(201).json(tag);
});

router.delete("/:id", (req, res) => {
  const userId = getUserId(req);
  const tag = db.select().from(tags).where(eq(tags.id, req.params.id)).get();

  if (!tag) { res.status(404).json({ error: "Not found" }); return; }
  if (tag.isSystem || tag.userId !== userId) {
    res.status(403).json({ error: "Cannot delete system or other user tags" });
    return;
  }

  db.delete(tags).where(eq(tags.id, req.params.id)).run();
  res.json({ success: true });
});

export default router;
