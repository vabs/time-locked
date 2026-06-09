import { Router } from "express";
import { db } from "../db/index.js";
import { decisions, decisionTags, notes, tags } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router();
const DECISION_STATUSES = ["running", "paused", "expired", "stopped"] as const;
type DecisionStatus = (typeof DECISION_STATUSES)[number];

function parseDecisionStatus(value: unknown): DecisionStatus | undefined {
  return typeof value === "string" &&
    DECISION_STATUSES.includes(value as DecisionStatus)
    ? (value as DecisionStatus)
    : undefined;
}

router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = getUserId(req);
  const status = parseDecisionStatus(req.query.status);

  const query = db.select().from(decisions).where(
    and(
      eq(decisions.userId, userId),
      status ? eq(decisions.status, status) : undefined
    )
  ).orderBy(desc(decisions.createdAt));

  const rows = query.all();
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const userId = getUserId(req);
  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }

  const decisionNotes = db
    .select()
    .from(notes)
    .where(eq(notes.decisionId, decision.id))
    .orderBy(desc(notes.createdAt))
    .all();

  const decisionTagRows = db
    .select({ tag: tags })
    .from(decisionTags)
    .innerJoin(tags, eq(decisionTags.tagId, tags.id))
    .where(eq(decisionTags.decisionId, decision.id))
    .all();

  res.json({ ...decision, notes: decisionNotes, tags: decisionTagRows.map((r) => r.tag) });
});

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { title, description, timerDuration, tagIds } = req.body;

  if (!title || !timerDuration) {
    res.status(400).json({ error: "title and timerDuration required" });
    return;
  }

  if (timerDuration < 3600) {
    res.status(400).json({ error: "Minimum timer duration is 1 hour" });
    return;
  }

  const id = randomUUID();
  const now = new Date();

  db.insert(decisions).values({
    id,
    userId,
    title,
    description: description ?? null,
    timerDuration,
    timerStartedAt: now,
    status: "running",
    createdAt: now,
    updatedAt: now,
  }).run();

  if (tagIds?.length) {
    db.insert(decisionTags).values(
      tagIds.map((tagId: string) => ({ decisionId: id, tagId }))
    ).run();
  }

  const decision = db.select().from(decisions).where(eq(decisions.id, id)).get();
  res.status(201).json(decision);
});

router.patch("/:id/pause", (req, res) => {
  const userId = getUserId(req);
  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }
  if (decision.status !== "running") {
    res.status(400).json({ error: "Can only pause running decisions" });
    return;
  }

  const now = new Date();
  const elapsed =
    (now.getTime() - decision.timerStartedAt!.getTime()) / 1000 +
    decision.timeElapsedBeforePause;

  db.update(decisions)
    .set({
      status: "paused",
      timerPausedAt: now,
      timeElapsedBeforePause: Math.floor(elapsed),
      updatedAt: now,
    })
    .where(eq(decisions.id, decision.id))
    .run();

  res.json({ success: true });
});

router.patch("/:id/resume", (req, res) => {
  const userId = getUserId(req);
  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }
  if (decision.status !== "paused") {
    res.status(400).json({ error: "Can only resume paused decisions" });
    return;
  }

  const now = new Date();
  db.update(decisions)
    .set({ status: "running", timerStartedAt: now, timerPausedAt: null, updatedAt: now })
    .where(eq(decisions.id, decision.id))
    .run();

  res.json({ success: true });
});

router.patch("/:id/stop", (req, res) => {
  const userId = getUserId(req);
  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }
  if (decision.status === "expired" || decision.status === "stopped") {
    res.status(400).json({ error: "Decision already finalized" });
    return;
  }

  db.update(decisions)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(decisions.id, decision.id))
    .run();

  res.json({ success: true });
});

router.patch("/:id/outcome", (req, res) => {
  const userId = getUserId(req);
  const { outcome } = req.body;

  if (!outcome) { res.status(400).json({ error: "outcome required" }); return; }

  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }
  if (decision.status !== "expired") {
    res.status(400).json({ error: "Can only record outcome on expired decisions" });
    return;
  }

  db.update(decisions)
    .set({ outcome, updatedAt: new Date() })
    .where(eq(decisions.id, decision.id))
    .run();

  res.json({ success: true });
});

export default router;
