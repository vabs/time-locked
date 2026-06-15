import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionListItems } from "../src/services/decisionList.js";

test("adds tags and note counts to each decision list item", () => {
  const createdAt = new Date("2026-06-14T12:00:00Z");
  const decisions = [
    {
      id: "decision-1",
      userId: "user-1",
      title: "Pick a launch date",
      description: null,
      timerDuration: 3600,
      timerStartedAt: createdAt,
      timerPausedAt: null,
      timeElapsedBeforePause: 0,
      status: "running" as const,
      outcome: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "decision-2",
      userId: "user-1",
      title: "Choose a vendor",
      description: null,
      timerDuration: 7200,
      timerStartedAt: createdAt,
      timerPausedAt: null,
      timeElapsedBeforePause: 0,
      status: "paused" as const,
      outcome: null,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const items = buildDecisionListItems({
    decisions,
    tagRows: [
      {
        decisionId: "decision-1",
        tag: {
          id: "tag-1",
          userId: "user-1",
          name: "Work",
          color: "#2563eb",
          isSystem: false,
        },
      },
    ],
    noteCountRows: [{ decisionId: "decision-1", noteCount: 2 }],
  });

  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      tags: item.tags.map((tag) => tag.name),
      noteCount: item.noteCount,
    })),
    [
      { id: "decision-1", tags: ["Work"], noteCount: 2 },
      { id: "decision-2", tags: [], noteCount: 0 },
    ]
  );
});
