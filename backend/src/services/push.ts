import webpush from "web-push";
import { db } from "../db/index.js";
import { pushSubscriptions } from "../db/schema.js";
import { eq } from "drizzle-orm";

const isPushConfigured =
  Boolean(process.env.VAPID_EMAIL) &&
  Boolean(process.env.VAPID_PUBLIC_KEY) &&
  Boolean(process.env.VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; decisionId: string }
) {
  if (!isPushConfigured) return;

  const subs = db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .all();

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      // Subscription expired or invalid — remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint)).run();
      }
    }
  }
}
