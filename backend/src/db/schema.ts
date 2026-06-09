import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timerDuration: integer("timer_duration").notNull(), // seconds
  timerStartedAt: integer("timer_started_at", { mode: "timestamp" }),
  timerPausedAt: integer("timer_paused_at", { mode: "timestamp" }),
  timeElapsedBeforePause: integer("time_elapsed_before_pause").notNull().default(0), // seconds
  status: text("status", {
    enum: ["running", "paused", "expired", "stopped"],
  })
    .notNull()
    .default("running"),
  outcome: text("outcome"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id")
    .notNull()
    .references(() => decisions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // null = system tag
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
});

export const decisionTags = sqliteTable("decision_tags", {
  decisionId: text("decision_id")
    .notNull()
    .references(() => decisions.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
