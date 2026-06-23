import cron from "node-cron";
import { db } from "../db/index.js";
import { decisions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendPushToUser } from "./push.js";
import { hasTimerElapsed } from "./decisionTimer.js";

export function startScheduler() {
  // Poll every 30 seconds for expired timers
  cron.schedule("*/30 * * * * *", async () => {
    const now = new Date();

    const running = db
      .select()
      .from(decisions)
      .where(eq(decisions.status, "running"))
      .all();

    for (const decision of running) {
      if (hasTimerElapsed(decision, now)) {
        db.update(decisions)
          .set({ status: "expired", updatedAt: now })
          .where(eq(decisions.id, decision.id))
          .run();

        await sendPushToUser(decision.userId, {
          title: "Time to decide",
          body: `Your reflection time for "${decision.title}" is up.`,
          decisionId: decision.id,
        });
      }
    }
  });
}
