import { Router } from "express";
import { db } from "../db/index.js";
import { decisions, decisionTags, notes, tags, type Decision } from "../db/schema.js";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth.js";
import { getAuthorizedTagIds } from "../services/tagAccess.js";
import { buildDecisionListItems } from "../services/decisionList.js";
import { hasTimerElapsed } from "../services/decisionTimer.js";
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

// Lazily flip an elapsed running timer to "expired" so reads and the outcome
// endpoint don't depend on the 30s scheduler poll. Returns the current decision.
function expireIfElapsed(decision: Decision, now: Date): Decision {
  if (!hasTimerElapsed(decision, now)) return decision;
  db.update(decisions)
    .set({ status: "expired", updatedAt: now })
    .where(eq(decisions.id, decision.id))
    .run();
  return { ...decision, status: "expired", updatedAt: now };
}

// Reconcile every elapsed running timer for a user before a list read so status
// filters (dashboard "running", history "expired") return accurate results.
function reconcileExpired(userId: string): void {
  const now = new Date();
  const running = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.userId, userId), eq(decisions.status, "running")))
    .all();
  const elapsedIds = running.filter((d) => hasTimerElapsed(d, now)).map((d) => d.id);
  if (elapsedIds.length) {
    db.update(decisions)
      .set({ status: "expired", updatedAt: now })
      .where(inArray(decisions.id, elapsedIds))
      .run();
  }
}

router.use(requireAuth);

router.get("/", (req, res) => {
  const userId = getUserId(req);
  const status = parseDecisionStatus(req.query.status);

  reconcileExpired(userId);

  const query = db.select().from(decisions).where(
    and(
      eq(decisions.userId, userId),
      status ? eq(decisions.status, status) : undefined
    )
  ).orderBy(desc(decisions.createdAt));

  const rows = query.all();
  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const decisionIds = rows.map((decision) => decision.id);
  const decisionTagRows = db
    .select({ decisionId: decisionTags.decisionId, tag: tags })
    .from(decisionTags)
    .innerJoin(tags, eq(decisionTags.tagId, tags.id))
    .where(inArray(decisionTags.decisionId, decisionIds))
    .all();

  const noteCountRows = db
    .select({ decisionId: notes.decisionId, noteCount: count(notes.id) })
    .from(notes)
    .where(inArray(notes.decisionId, decisionIds))
    .groupBy(notes.decisionId)
    .all();

  res.json(buildDecisionListItems({ decisions: rows, tagRows: decisionTagRows, noteCountRows }));
});

router.get("/:id", (req, res) => {
  const userId = getUserId(req);
  const decision = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, req.params.id), eq(decisions.userId, userId)))
    .get();

  if (!decision) { res.status(404).json({ error: "Not found" }); return; }

  const current = expireIfElapsed(decision, new Date());

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

  res.json({ ...current, notes: decisionNotes, tags: decisionTagRows.map((r) => r.tag) });
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

  const requestedTagIds = tagIds === undefined ? [] : tagIds;
  if (!Array.isArray(requestedTagIds) || requestedTagIds.some((tagId) => typeof tagId !== "string")) {
    res.status(400).json({ error: "tagIds must be an array of strings" });
    return;
  }

  let authorizedTagIds: string[] = [];
  if (requestedTagIds.length) {
    const visibleTags = db
      .select({ id: tags.id, userId: tags.userId })
      .from(tags)
      .where(
        and(
          inArray(tags.id, requestedTagIds),
          or(isNull(tags.userId), eq(tags.userId, userId))
        )
      )
      .all();

    try {
      authorizedTagIds = getAuthorizedTagIds(userId, requestedTagIds, visibleTags);
    } catch {
      res.status(400).json({ error: "Invalid tag selection" });
      return;
    }
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

  if (authorizedTagIds.length) {
    db.insert(decisionTags).values(
      authorizedTagIds.map((tagId) => ({ decisionId: id, tagId }))
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

  const current = expireIfElapsed(decision, new Date());
  // Outcome can be recorded once a decision is terminal: the timer expired or
  // it was stopped early (decided ahead of time).
  if (current.status !== "expired" && current.status !== "stopped") {
    res.status(400).json({
      error: "Can only record an outcome once the timer has ended or the decision was stopped",
    });
    return;
  }

  db.update(decisions)
    .set({ outcome, updatedAt: new Date() })
    .where(eq(decisions.id, decision.id))
    .run();

  res.json({ success: true });
});

export default router;
