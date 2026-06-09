import { Router } from "express";
import { db } from "../db/index.js";
import { decisions, notes } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { content } = req.body;

  if (!content) { res.status(400).json({ error: "content required" }); return; }

  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.decisionId), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }

  if (decision.status === "stopped") {
    res.status(400).json({ error: "Cannot add notes to stopped decision" });
    return;
  }

  const note = {
    id: randomUUID(),
    decisionId: decision.id,
    content,
    createdAt: new Date(),
  };

  db.insert(notes).values(note).run();
  res.status(201).json(note);
});

router.delete("/:noteId", (req, res) => {
  const userId = getUserId(req);

  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.decisionId), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }

  db.delete(notes)
    .where(and(eq(notes.id, req.params.noteId), eq(notes.decisionId, decision.id)))
    .run();

  res.json({ success: true });
});

export default router;
