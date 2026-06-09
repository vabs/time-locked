import { Router } from "express";
import { db } from "../db/index.js";
import { pushSubscriptions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, getUserId } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = Router();

router.use(requireAuth);

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post("/subscribe", (req, res) => {
  const userId = getUserId(req);
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription object" });
    return;
  }

  db.insert(pushSubscriptions)
    .values({
      id: randomUUID(),
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth },
    })
    .run();

  res.status(201).json({ success: true });
});

router.delete("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: "endpoint required" }); return; }
  db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
  res.json({ success: true });
});

export default router;
